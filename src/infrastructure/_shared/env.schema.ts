import { z } from 'zod';

// Kept in sync with .env.example's own JWT_SECRET placeholder - rejected
// here so a forgotten swap fails loudly at boot instead of shipping a
// publicly-known signing secret.
const JWT_SECRET_PLACEHOLDER =
  'troque-por-um-secret-forte-de-pelo-menos-32-caracteres';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().optional(),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine((value) => value !== JWT_SECRET_PLACEHOLDER, {
      message:
        'JWT_SECRET is still the placeholder value from .env.example - generate a real secret before starting the app',
    }),
  CORS_ORIGIN: z.string().optional(),
  REDIS_URL: z.string().min(1),
  CACHE_REDIS_URL: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
