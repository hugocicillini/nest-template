import { z } from 'zod';

/**
 * Shared by register/reset/change-password DTOs. Max length guards against
 * feeding bcrypt (72-byte input limit, silently truncated) an arbitrarily
 * long string - see BcryptPasswordHasher's own guard for the enforcement of
 * that specific limit; this max is a generous upper bound at the DTO level.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
