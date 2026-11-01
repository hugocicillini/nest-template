import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignPermissionSchema = z.object({
  permissionId: z.uuid(),
});

export class AssignPermissionDto extends createZodDto(AssignPermissionSchema) {}
