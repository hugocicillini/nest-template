import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreatePermissionSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(255).optional(),
});

export class CreatePermissionDto extends createZodDto(CreatePermissionSchema) {}
