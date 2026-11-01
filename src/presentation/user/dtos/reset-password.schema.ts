import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { passwordSchema } from './password.schema';

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
