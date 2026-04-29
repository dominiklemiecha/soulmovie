import { z } from 'zod';
import { emailSchema } from './common.js';

export const smtpSettingsSchema = z.object({
  host: z.string().trim().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  user: z.string().trim().max(255).default(''),
  password: z.string().max(255).default(''),
  from: emailSchema,
  tls: z.boolean().default(true),
});
export type SmtpSettingsDto = z.infer<typeof smtpSettingsSchema>;

export const smtpTestSchema = z.object({
  to: emailSchema,
});
export type SmtpTestDto = z.infer<typeof smtpTestSchema>;
