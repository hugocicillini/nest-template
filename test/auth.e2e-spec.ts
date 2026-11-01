import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Response } from 'supertest';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  MAX_FAILED_LOGIN_ATTEMPTS,
  loginFailureCacheKey,
} from '@application/user/login-lockout';
import { createTestApp, TestApp } from './support/create-test-app';

const PASSWORD = 'Senha123';
const NEW_PASSWORD = 'NovaSenha456';

interface RegisterResponseBody {
  id: string;
}

interface LoginResponseBody {
  accessToken: string;
}

interface MeResponseBody {
  emailVerified: boolean;
}

function uniqueEmail(): string {
  return `test-${randomUUID()}@example.com`;
}

/** Extracts a raw token logged as "...: <token>" at the end of a fake email body. */
function extractToken(body: string): string {
  const token = body.split(': ').pop();
  if (!token) {
    throw new Error(`Could not extract token from email body: ${body}`);
  }
  return token;
}

function extractRefreshTokenCookie(res: Response): string {
  const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const refreshCookie = cookies.find((c) => c?.startsWith('refreshToken='));
  if (!refreshCookie) {
    throw new Error('No refreshToken cookie in response');
  }
  return refreshCookie.split(';')[0];
}

describe('Auth (e2e)', () => {
  let testApp: TestApp;
  let app: INestApplication<App>;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('register → login → refresh → logout', () => {
    const email = uniqueEmail();
    let refreshCookie: string;

    afterAll(async () => {
      await testApp.prisma.user.deleteMany({ where: { email } });
    });

    it('registers a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Test User', email, password: PASSWORD })
        .expect(201);

      const body = res.body as RegisterResponseBody;
      expect(body.id).toEqual(expect.any(String));
    });

    it('rejects a duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Test User', email, password: PASSWORD })
        .expect(409);
    });

    it('rejects login with the wrong password', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: 'WrongPassword1' })
        .expect(401);
    });

    it('logs in and sets the refreshToken cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(201);

      const body = res.body as LoginResponseBody;
      expect(body.accessToken).toEqual(expect.any(String));
      refreshCookie = extractRefreshTokenCookie(res);
    });

    it('rotates the refresh token and invalidates the old one', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(201);

      const body = res.body as LoginResponseBody;
      expect(body.accessToken).toEqual(expect.any(String));
      const rotatedCookie = extractRefreshTokenCookie(res);
      expect(rotatedCookie).not.toEqual(refreshCookie);

      // The old cookie was revoked by rotation - replaying it must fail.
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);

      refreshCookie = rotatedCookie;
    });

    it('logs out and invalidates the refresh cookie', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Cookie', refreshCookie)
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
    });
  });

  describe('password reset', () => {
    const email = uniqueEmail();

    afterAll(async () => {
      await testApp.prisma.user.deleteMany({ where: { email } });
    });

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Reset User', email, password: PASSWORD })
        .expect(201);
    });

    it('responds identically for a real and a made-up email (no enumeration)', async () => {
      const real = await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email })
        .expect(201);

      const fake = await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: uniqueEmail() })
        .expect(201);

      expect(real.body).toEqual({});
      expect(fake.body).toEqual({});
    });

    it('resets the password with the emailed token, and the token is single-use', async () => {
      const resetEmail = testApp.emailQueue.sentEmails.find(
        (e) => e.to === email && e.subject.includes('Redefinição'),
      );
      if (!resetEmail) {
        throw new Error('Reset email was not captured by the fake queue');
      }
      const token = extractToken(resetEmail.body);

      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token, newPassword: NEW_PASSWORD })
        .expect(201);

      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(401);

      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: NEW_PASSWORD })
        .expect(201);

      // Reusing the same (now-consumed) token must fail.
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({ token, newPassword: 'AnotherPass789' })
        .expect(401);
    });
  });

  describe('email verification', () => {
    const email = uniqueEmail();
    let accessToken: string;

    afterAll(async () => {
      await testApp.prisma.user.deleteMany({ where: { email } });
    });

    it('registers, verifies the email with the emailed token, and reflects it on /users/me', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({ name: 'Verify User', email, password: PASSWORD })
        .expect(201);

      const welcomeEmail = testApp.emailQueue.sentEmails.find(
        (e) => e.to === email && e.subject.includes('cadastro'),
      );
      if (!welcomeEmail) {
        throw new Error('Welcome email was not captured by the fake queue');
      }
      const token = extractToken(welcomeEmail.body);

      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: PASSWORD })
        .expect(201);
      accessToken = (login.body as LoginResponseBody).accessToken;

      const me = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = me.body as MeResponseBody;
      expect(body.emailVerified).toBe(true);
    });
  });

  describe('request validation', () => {
    interface ErrorResponseBody {
      statusCode: number;
      code: string;
      message: string;
      errors?: unknown[];
      requestId?: string;
    }

    it('rejects a malformed body with a 400 and field-level detail, not a generic 500', async () => {
      // verify-email has no @Throttle override (global default is 100/60s),
      // so this doesn't compete with the request budget the other describe
      // blocks in this file spend on register/login/request-password-reset.
      const res = await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({}) // missing the required `token` field
        .expect(400);

      const body = res.body as ErrorResponseBody;
      expect(body.statusCode).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(body.errors?.length).toBeGreaterThan(0);
      expect(body.requestId).toEqual(expect.any(String));
    });
  });
});

describe('Auth rate limiting (e2e)', () => {
  // Own app instance so the throttler's in-memory counters start fresh,
  // independent of how many /auth/login calls the other describe blocks make.
  let rateLimitedApp: TestApp;
  const email = uniqueEmail();

  beforeAll(async () => {
    rateLimitedApp = await createTestApp();
    await request(rateLimitedApp.app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Rate Limited User', email, password: PASSWORD });
  });

  afterAll(async () => {
    await rateLimitedApp.prisma.user.deleteMany({ where: { email } });
    await rateLimitedApp.app.close();
  });

  it('throttles login after 5 requests per minute', async () => {
    for (let i = 0; i < 5; i++) {
      await request(rateLimitedApp.app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email, password: 'WrongPassword1' })
        .expect(401);
    }

    await request(rateLimitedApp.app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(429);
  });
});

describe('Account lockout (e2e)', () => {
  // Own app instance for the same reason as "Auth rate limiting" above -
  // fresh throttler counters. This also sidesteps a real interaction: /auth
  // /login's own IP throttle (5/60s) would otherwise intercept a 6th request
  // before it ever reached the account-lockout check, since ThrottlerGuard
  // runs first. Seeding the failure count directly in the cache tests the
  // lockout's own HTTP-level behavior in isolation, instead of re-proving
  // the increment logic already covered by login.handler.spec.ts.
  let lockedApp: TestApp;
  const email = uniqueEmail();

  beforeAll(async () => {
    lockedApp = await createTestApp();
    await request(lockedApp.app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Lockout User', email, password: PASSWORD });
  });

  afterAll(async () => {
    await lockedApp.prisma.user.deleteMany({ where: { email } });
    await lockedApp.app.close();
  });

  afterEach(async () => {
    await lockedApp.cache.del(loginFailureCacheKey(email));
  });

  it('locks the account after the failure threshold, even with the correct password', async () => {
    await lockedApp.cache.set(
      loginFailureCacheKey(email),
      MAX_FAILED_LOGIN_ATTEMPTS,
    );

    await request(lockedApp.app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(423);
  });

  it('clears the lockout once the password is reset', async () => {
    await lockedApp.cache.set(
      loginFailureCacheKey(email),
      MAX_FAILED_LOGIN_ATTEMPTS,
    );

    await request(lockedApp.app.getHttpServer())
      .post('/v1/auth/request-password-reset')
      .send({ email })
      .expect(201);

    const resetEmail = lockedApp.emailQueue.sentEmails
      .filter((e) => e.to === email && e.subject.includes('Redefinição'))
      .pop();
    if (!resetEmail) {
      throw new Error('Reset email was not captured by the fake queue');
    }
    const token = extractToken(resetEmail.body);

    await request(lockedApp.app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD })
      .expect(201);

    // Still "locked" by count alone - if reset-password hadn't cleared the
    // counter, this would come back 423 instead of a normal successful login.
    await request(lockedApp.app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: NEW_PASSWORD })
      .expect(201);
  });
});
