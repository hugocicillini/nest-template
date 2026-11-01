import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';

interface NormalizedBody {
  code: string;
  message: string;
  errors?: unknown;
}

function extractMessage(body: unknown): string {
  if (typeof body === 'string') {
    return body;
  }
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }
  return 'Unexpected error';
}

// Built-in Nest exceptions (UnauthorizedException, NotFoundException, ...)
// have no domain-specific code of their own - derive a reasonably stable
// one from the class name (UnauthorizedException -> UNAUTHORIZED) rather
// than leaving every one of them as the same generic string.
function deriveCode(exception: HttpException): string {
  return exception.constructor.name
    .replace(/Exception$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function normalize(exception: HttpException): NormalizedBody {
  const body = exception.getResponse();

  if (exception instanceof ZodValidationException) {
    const errors =
      body && typeof body === 'object' && 'errors' in body
        ? body.errors
        : undefined;
    return { code: 'VALIDATION_ERROR', message: extractMessage(body), errors };
  }

  return { code: deriveCode(exception), message: extractMessage(body) };
}

/**
 * Fallback for anything DomainExceptionFilter doesn't handle - genuine bugs,
 * not expected business-flow exceptions. Must be registered *before*
 * DomainExceptionFilter in app.useGlobalFilters(...) - verified empirically
 * (e2e suite went from 13/13 to 6/13 with the order the other way: every
 * DomainException resolved as a generic 500 instead of its mapped
 * status/code). Nest gives priority to the filter registered LAST when more
 * than one @Catch() matches, which is the opposite of a plain first-match
 * Array.find() over the registration order - this filter's empty @Catch()
 * matches everything, so if it were registered after DomainExceptionFilter
 * it would shadow it entirely instead of the other way around.
 *
 * Framework-level HttpExceptions (Zod validation failures, a guard's
 * UnauthorizedException, etc.) land here too, since they aren't
 * DomainExceptions - these already carry their own correct status/body, so
 * they're forwarded as-is instead of being flattened into a generic 500.
 * @SentryExceptionCaptured() already recognizes these via its own
 * isExpectedError() check and only reports genuine unknown errors, not
 * well-formed HttpExceptions - no extra handling needed here for that part.
 */
@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { id?: string }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { code, message, errors } = normalize(exception);

      response.status(status).json({
        statusCode: status,
        code,
        message,
        ...(errors ? { errors } : {}),
        requestId: request.id,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId: request.id,
    });
  }
}
