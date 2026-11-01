import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.email().optional(),
  active: z.boolean().optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
