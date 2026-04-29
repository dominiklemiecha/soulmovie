import { z } from 'zod';

const optStr = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v === '' ? null : v));

const optDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Formato YYYY-MM-DD');

export enum CertificateStatus {
  VALID = 'valid',
  EXPIRING_60 = 'expiring_60',
  EXPIRING_30 = 'expiring_30',
  EXPIRING_7 = 'expiring_7',
  EXPIRED = 'expired',
  NO_EXPIRY = 'no_expiry',
  INVALID = 'invalid',
}

export const certificateTypeCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_\-]+$/, 'solo lettere, numeri, _ e -'),
  name: z.string().trim().min(1).max(255),
  requiresExpiry: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type CertificateTypeCreateDto = z.infer<typeof certificateTypeCreateSchema>;

export const certificateTypeUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  requiresExpiry: z.boolean().optional(),
  active: z.boolean().optional(),
});
export type CertificateTypeUpdateDto = z.infer<typeof certificateTypeUpdateSchema>;

export const presignUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(25 * 1024 * 1024, 'Massimo 25 MB'),
});
export type PresignUploadDto = z.infer<typeof presignUploadSchema>;

const emailListSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => {
    if (!v) return [] as string[];
    return v
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
  })
  .refine(
    (arr) => arr.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    'Una o più email non sono valide',
  );

export const certificateCreateSchema = z.object({
  typeId: z.string().uuid(),
  nomeAlternativo: optStr(120),
  numero: optStr(120),
  dataEmissione: optDate,
  dataScadenza: optDate,
  emittente: optStr(255),
  ambito: optStr(255),
  descrizione: optStr(2000),
  notifyEmails: emailListSchema,
  documentObjectKey: z.string().min(1).max(500),
  documentFilename: z.string().min(1).max(255),
  documentMime: z.string().min(1).max(120),
  documentSize: z.number().int().positive().max(25 * 1024 * 1024),
});
export type CertificateCreateDto = z.infer<typeof certificateCreateSchema>;

export const certificateUpdateSchema = z.object({
  typeId: z.string().uuid().optional(),
  nomeAlternativo: optStr(120),
  numero: optStr(120),
  dataEmissione: optDate,
  dataScadenza: optDate,
  emittente: optStr(255),
  ambito: optStr(255),
  descrizione: optStr(2000),
  notifyEmails: emailListSchema,
});
export type CertificateUpdateDto = z.infer<typeof certificateUpdateSchema>;
