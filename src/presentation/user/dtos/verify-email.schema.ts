import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}
