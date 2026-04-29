import { z } from 'zod';
import { emailSchema } from './common.js';

const optStr = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v === '' ? null : v));

const optEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine(
    (v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Email non valida',
  );

export const contactCreateSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  cognome: z.string().trim().min(1).max(120),
  ruolo: optStr(120),
  email: optEmail,
  telefono: optStr(64),
  cellulare: optStr(64),
  isMain: z.boolean().default(false),
});
export type ContactCreateDto = z.infer<typeof contactCreateSchema>;

export const contactUpdateSchema = contactCreateSchema;
export type ContactUpdateDto = z.infer<typeof contactUpdateSchema>;

// silence unused import in some bundles
export const _e = emailSchema;
