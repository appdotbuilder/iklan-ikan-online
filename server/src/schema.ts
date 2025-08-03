
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  membership_id: z.number().nullable(),
  boost_credits: z.number().int().nonnegative(),
  is_admin: z.boolean(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Membership package schema
export const membershipPackageSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  duration_days: z.number().int().positive(),
  max_ads: z.number().int().positive(),
  boost_credits: z.number().int().nonnegative(),
  features: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type MembershipPackage = z.infer<typeof membershipPackageSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  icon_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Ad schema
export const adSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  category_id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  location: z.string(),
  contact_info: z.string(),
  images: z.array(z.string()),
  is_boosted: z.boolean(),
  boost_expires_at: z.coerce.date().nullable(),
  view_count: z.number().int().nonnegative(),
  contact_count: z.number().int().nonnegative(),
  status: z.enum(['draft', 'active', 'expired', 'rejected', 'deleted']),
  rejection_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Ad = z.infer<typeof adSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  membership_id: z.number().nullable(),
  ad_id: z.number().nullable(),
  type: z.enum(['membership', 'boost']),
  amount: z.number(),
  status: z.enum(['pending', 'paid', 'failed', 'cancelled']),
  midtrans_transaction_id: z.string().nullable(),
  midtrans_response: z.record(z.any()).nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Input schemas for creating
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  icon_url: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const createAdInputSchema = z.object({
  category_id: z.number(),
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  location: z.string().min(1),
  contact_info: z.string().min(1),
  images: z.array(z.string()).max(10)
});

export type CreateAdInput = z.infer<typeof createAdInputSchema>;

export const createMembershipPackageInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().positive(),
  duration_days: z.number().int().positive(),
  max_ads: z.number().int().positive(),
  boost_credits: z.number().int().nonnegative(),
  features: z.array(z.string())
});

export type CreateMembershipPackageInput = z.infer<typeof createMembershipPackageInputSchema>;

export const createPaymentInputSchema = z.object({
  membership_id: z.number().nullable(),
  ad_id: z.number().nullable(),
  type: z.enum(['membership', 'boost']),
  amount: z.number().positive()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

// Update schemas
export const updateUserInputSchema = z.object({
  id: z.number(),
  full_name: z.string().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateAdInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  location: z.string().optional(),
  contact_info: z.string().optional(),
  images: z.array(z.string()).max(10).optional()
});

export type UpdateAdInput = z.infer<typeof updateAdInputSchema>;

export const boostAdInputSchema = z.object({
  ad_id: z.number(),
  duration_days: z.number().int().positive()
});

export type BoostAdInput = z.infer<typeof boostAdInputSchema>;

export const moderateAdInputSchema = z.object({
  ad_id: z.number(),
  status: z.enum(['active', 'rejected']),
  rejection_reason: z.string().nullable()
});

export type ModerateAdInput = z.infer<typeof moderateAdInputSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Query schemas
export const getAdsInputSchema = z.object({
  category_id: z.number().optional(),
  user_id: z.number().optional(),
  search: z.string().optional(),
  location: z.string().optional(),
  min_price: z.number().optional(),
  max_price: z.number().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetAdsInput = z.infer<typeof getAdsInputSchema>;

export const getUsersInputSchema = z.object({
  search: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;
