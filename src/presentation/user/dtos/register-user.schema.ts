import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { passwordSchema } from './password.schema';

export const RegisterUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.email(),
  password: passwordSchema,
});

export class RegisterUserDto extends createZodDto(RegisterUserSchema) {}
