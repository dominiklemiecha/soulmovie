import { z } from 'zod';

export const categoryCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_\-]+$/, 'solo lettere, numeri, _ e -'),
  name: z.string().trim().min(1).max(255),
  parentId: z.string().uuid().optional().nullable(),
  orderIndex: z.number().int().min(0).max(99999).default(0),
  active: z.boolean().default(true),
});
export type CategoryCreateDto = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().min(0).max(99999).optional(),
  active: z.boolean().optional(),
});
export type CategoryUpdateDto = z.infer<typeof categoryUpdateSchema>;

export const supplierCategoriesSetSchema = z.object({
  categoryIds: z.array(z.string().uuid()).max(200),
});
export type SupplierCategoriesSetDto = z.infer<typeof supplierCategoriesSetSchema>;
