import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { createAdapter } from '@socket.io/redis-adapter';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Server } from 'socket.io';
import { AppModule } from './app.module';
import { parseRedisUrl } from './infrastructure/_shared/parse-redis-url';
import './instrument';
import { DomainExceptionFilter } from './presentation/_shared/filters/domain-exception.filter';
import { UnhandledExceptionFilter } from './presentation/_shared/filters/unhandled-exception.filter';

/**
 * Without this, Socket.io's default adapter only broadcasts to sockets
 * connected to the same process - a notification created on one replica
 * would silently never reach a user connected to another. Same lesson as
 * the throttler storage: shared state across instances needs Redis, not
 * in-memory defaults.
 */
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  connectToRedis(): Promise<void> {
    const pubClient = new Redis({
      ...parseRedisUrl(process.env.REDIS_URL as string),
      // parseRedisUrl's maxRetriesPerRequest: null is right for BullMQ, not
      // here - a Redis outage must fail the WS adapter fast, not hang every
      // connection/room operation forever.
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
    });
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
    return Promise.resolve();
  }

  createIOServer(port: number, options?: unknown): unknown {
    const server = super.createIOServer(port, options) as Server;
    // connectToRedis() always runs before this (see bootstrap() below) -
    // Nest only calls createIOServer() once a WS gateway actually starts
    // listening, which happens during app.listen(), well after that await.
    server.adapter(this.adapterConstructor!);
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  // Flushes buffered Sentry events (errors, transactions, logs) on
  // SIGTERM/SIGINT instead of dropping them when the process exits.
  app.enableShutdownHooks();
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Only trusts X-Forwarded-* when explicitly told how many reverse-proxy
  // hops sit in front of this process (e.g. 1 for a single load
  // balancer/ingress). Unset by default, so req.ip - what the throttler
  // keys rate limits on - stays the raw socket address (correct for
  // direct/local access) instead of trusting a client-supplied header that
  // would otherwise let it spoof its way around IP-based throttling.
  if (process.env.TRUST_PROXY_HOPS !== undefined) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  }

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    credentials: true,
    // Explicit allowlists instead of the cors package's open-by-omission
    // defaults (PUT included, and any Access-Control-Request-Headers
    // reflected back verbatim). PUT isn't used by any route here.
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Lets client-side JS read the request-id header (see the pinoHttp
    // genReqId config below) - browsers hide custom response headers from
    // JS by default unless explicitly exposed here.
    exposedHeaders: ['X-Request-Id'],
  });
  app.use(helmet());
  // Helmet has shipped no Permissions-Policy default since it dropped
  // feature-policy without a replacement - explicit opt-out of a few
  // sensitive browser APIs this JSON API has no reason to grant.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });
  // Gzips response bodies over ~1KB (the package's own default threshold) —
  // no-op for anything already tiny, like single-object error responses.
  app.use(compression());
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });
  app.useGlobalPipes(new ZodValidationPipe());
  // Order matters, and it's the OPPOSITE of what you'd guess: Nest gives
  // priority to the filter registered LAST when more than one @Catch()
  // matches - see UnhandledExceptionFilter's own doc comment for how this
  // was confirmed. Its empty @Catch() matches everything, so it must come
  // first for DomainExceptionFilter's more specific match to win.
  app.useGlobalFilters(
    new UnhandledExceptionFilter(),
    new DomainExceptionFilter(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Auth Template API')
    .setDescription(
      'Auth, RBAC, file uploads, and notifications for the NestJS auth template.',
    )
    .setVersion('1.0')
    .setContact('Hugo Cicillini', '', 'hugo.cicillini@hotmail.com')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Scalar loads its bundle from a CDN and injects an inline <script>;
  // the default CSP from helmet() above blocks both, so /docs gets
  // a relaxed policy that overrides it for this path only.
  app.use(
    '/docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
          ],
          'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
          ],
        },
      },
    }),
  );
  app.use('/docs', apiReference({ content: document }));

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const server = await app.listen(process.env.PORT ?? 3000);
  // Fail fast instead of hanging indefinitely: a slow-to-send-headers or
  // idle-mid-request client shouldn't hold a connection open forever, and
  // keepAliveTimeout above the typical LB/ingress idle timeout (usually
  // ~60s) avoids a race where the upstream closes a "keep-alive" socket
  // just as this process tries to reuse it.
  server.headersTimeout = 60_000;
  server.requestTimeout = 300_000;
  server.keepAliveTimeout = 65_000;
}
void bootstrap();
