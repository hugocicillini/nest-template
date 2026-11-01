import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RequestPasswordResetSchema = z.object({
  email: z.email(),
});

export class RequestPasswordResetDto extends createZodDto(
  RequestPasswordResetSchema,
) {}
