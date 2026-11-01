import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.email().optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
