import { z } from 'zod';
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z.string().min(10).max(128)
  .regex(/[A-Z]/, 'deve contenere maiuscola')
  .regex(/[a-z]/, 'deve contenere minuscola')
  .regex(/[0-9]/, 'deve contenere numero');
export const partitaIvaSchema = z.string().regex(/^\d{11}$/).optional().nullable();
export const codiceFiscaleSchema = z.string().regex(/^[A-Z0-9]{11,16}$/i).optional().nullable();
