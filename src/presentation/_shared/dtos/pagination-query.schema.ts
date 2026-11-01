import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}
