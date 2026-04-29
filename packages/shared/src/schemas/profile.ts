import { z } from 'zod';
import { codiceFiscaleSchema, emailSchema, partitaIvaSchema, passwordSchema } from './common.js';
import { Gender, LegalNature } from '../enums.js';
import { isValidCountryCode } from '../reference/countries.js';
import { isValidProvinciaIT } from '../reference/provinces-it.js';
import { isValidCurrencyCode } from '../reference/currencies.js';

const optStr = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v === '' ? null : v));

const optDateString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data non valida (YYYY-MM-DD)');

const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => isValidCountryCode(v), 'Paese non valido');

const optCountrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine((v) => v === null || isValidCountryCode(v), 'Paese non valido');

const optProvinciaItSchema = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v == null ? null : v))
  .refine((v) => v === null || isValidProvinciaIT(v), 'Provincia non valida');

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => isValidCurrencyCode(v), 'Valuta non valida');

export const supplierUpdateSchema = z
  .object({
    isPersonaFisica: z.boolean().default(false),
    ragioneSociale: z.string().trim().min(2).max(255),
    nome: optStr(120),
    sesso: z.nativeEnum(Gender).optional().nullable(),
    paeseNascita: optCountrySchema,
    provinciaNascita: optProvinciaItSchema,
    cittaNascita: optStr(120),
    dataNascita: optDateString,

    paese: countrySchema.default('IT'),
    indirizzo: optStr(255),
    cap: optStr(16),
    citta: optStr(120),
    provincia: optProvinciaItSchema,

    sitoWeb: optStr(255),
    emailAziendale: optStr(255),
    pec: optStr(255),
    telefono: optStr(64),

    naturaGiuridica: z.nativeEnum(LegalNature).optional().nullable(),
    viesRegistered: z.boolean().default(false),
    codiceFiscale: codiceFiscaleSchema,
    partitaIva: partitaIvaSchema,
    partitaIvaExtraUe: optStr(64),
    iban: optStr(64),
    valuta: currencySchema.default('EUR'),
    gruppoIva: optStr(255),
  })
  .superRefine((d, ctx) => {
    if (d.isPersonaFisica) {
      if (!d.nome || !d.nome.trim()) {
        ctx.addIssue({ code: 'custom', path: ['nome'], message: 'Obbligatorio per persona fisica' });
      }
      if (!d.dataNascita) {
        ctx.addIssue({
          code: 'custom',
          path: ['dataNascita'],
          message: 'Obbligatoria per persona fisica',
        });
      }
    }
  });
export type SupplierUpdateDto = z.infer<typeof supplierUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'la nuova password deve essere diversa',
    path: ['newPassword'],
  });
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1),
});
export type ChangeEmailDto = z.infer<typeof changeEmailSchema>;

export const supplierRejectSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type SupplierRejectDto = z.infer<typeof supplierRejectSchema>;
