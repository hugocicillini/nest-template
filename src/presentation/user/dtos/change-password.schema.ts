import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { passwordSchema } from './password.schema';

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
