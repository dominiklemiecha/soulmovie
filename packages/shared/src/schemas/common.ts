import { z } from 'zod';
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().toLowerCase().trim();
export const passwordSchema = z.string().min(10).max(128)
  .regex(/[A-Z]/, 'deve contenere maiuscola')
  .regex(/[a-z]/, 'deve contenere minuscola')
  .regex(/[0-9]/, 'deve contenere numero');
export const partitaIvaSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^IT/i, '').replace(/\s+/g, ''))
  .refine((v) => v === '' || /^\d{11}$/.test(v), 'P.IVA: 11 cifre, eventuale prefisso IT')
  .transform((v) => (v === '' ? null : v))
  .optional()
  .nullable();

export const codiceFiscaleSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/\s+/g, ''))
  .refine((v) => v === '' || /^[A-Z0-9]{11,16}$/.test(v), 'Codice fiscale non valido')
  .transform((v) => (v === '' ? null : v))
  .optional()
  .nullable();
