import type { ArgumentsHost } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { UnhandledExceptionFilter } from './unhandled-exception.filter';

interface ResponseBody {
  statusCode: number;
  code: string;
  message: string;
  requestId?: string;
  errors?: unknown[];
}

function mockHost() {
  const json = jest.fn<void, [ResponseBody]>();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { id: 'req-1' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('UnhandledExceptionFilter', () => {
  let filter: UnhandledExceptionFilter;

  beforeEach(() => {
    filter = new UnhandledExceptionFilter();
  });

  it('forwards a Zod validation failure as 400 with field-level detail, not a generic 500', () => {
    const schema = z.object({ email: z.email() });
    const parseResult = schema.safeParse({ email: 'not-an-email' });
    const zodError = !parseResult.success ? parseResult.error : undefined;
    const exception = new ZodValidationException(zodError);
    const { host, status, json } = mockHost();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    const [body] = json.mock.calls[0];
    expect(body.statusCode).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBe('req-1');
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors?.length).toBeGreaterThan(0);
  });

  it('forwards a plain NestJS HttpException with its own status and a derived code', () => {
    const exception = new UnauthorizedException('Missing token');
    const { host, status, json } = mockHost();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(401);
    const [body] = json.mock.calls[0];
    expect(body.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.message).toBe('Missing token');
    expect(body.requestId).toBe('req-1');
  });

  it('falls back to a generic 500 for a genuinely unknown error', () => {
    const exception = new Error('something exploded');
    const { host, status, json } = mockHost();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId: 'req-1',
    });
  });
});
