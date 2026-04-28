import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

export const registerSelfSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  ragioneSociale: z.string().min(2).max(255),
});
export type RegisterSelfDto = z.infer<typeof registerSelfSchema>;

export const inviteSupplierSchema = z.object({
  email: emailSchema,
  ragioneSociale: z.string().min(2).max(255),
});
export type InviteSupplierDto = z.infer<typeof inviteSupplierSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(10) });
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
