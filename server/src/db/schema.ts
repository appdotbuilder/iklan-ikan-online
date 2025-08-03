
import { serial, text, pgTable, timestamp, numeric, integer, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const adStatusEnum = pgEnum('ad_status', ['draft', 'active', 'expired', 'rejected', 'deleted']);
export const paymentTypeEnum = pgEnum('payment_type', ['membership', 'boost']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone'),
  avatar_url: text('avatar_url'),
  membership_id: integer('membership_id'),
  boost_credits: integer('boost_credits').notNull().default(0),
  is_admin: boolean('is_admin').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Membership packages table
export const membershipPackagesTable = pgTable('membership_packages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  duration_days: integer('duration_days').notNull(),
  max_ads: integer('max_ads').notNull(),
  boost_credits: integer('boost_credits').notNull().default(0),
  features: json('features').$type<string[]>().notNull().default([]),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon_url: text('icon_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Ads table
export const adsTable = pgTable('ads', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  category_id: integer('category_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  location: text('location').notNull(),
  contact_info: text('contact_info').notNull(),
  images: json('images').$type<string[]>().notNull().default([]),
  is_boosted: boolean('is_boosted').notNull().default(false),
  boost_expires_at: timestamp('boost_expires_at'),
  view_count: integer('view_count').notNull().default(0),
  contact_count: integer('contact_count').notNull().default(0),
  status: adStatusEnum('status').notNull().default('draft'),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  membership_id: integer('membership_id'),
  ad_id: integer('ad_id'),
  type: paymentTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  midtrans_transaction_id: text('midtrans_transaction_id'),
  midtrans_response: json('midtrans_response'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  membership: one(membershipPackagesTable, {
    fields: [usersTable.membership_id],
    references: [membershipPackagesTable.id],
  }),
  ads: many(adsTable),
  payments: many(paymentsTable),
}));

export const membershipPackagesRelations = relations(membershipPackagesTable, ({ many }) => ({
  users: many(usersTable),
  payments: many(paymentsTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  ads: many(adsTable),
}));

export const adsRelations = relations(adsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [adsTable.user_id],
    references: [usersTable.id],
  }),
  category: one(categoriesTable, {
    fields: [adsTable.category_id],
    references: [categoriesTable.id],
  }),
  payments: one(paymentsTable, {
    fields: [adsTable.id],
    references: [paymentsTable.ad_id],
  }),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [paymentsTable.user_id],
    references: [usersTable.id],
  }),
  membership: one(membershipPackagesTable, {
    fields: [paymentsTable.membership_id],
    references: [membershipPackagesTable.id],
  }),
  ad: one(adsTable, {
    fields: [paymentsTable.ad_id],
    references: [adsTable.id],
  }),
}));

// Export all tables for drizzle relations
export const tables = {
  users: usersTable,
  membershipPackages: membershipPackagesTable,
  categories: categoriesTable,
  ads: adsTable,
  payments: paymentsTable,
};

// TypeScript types
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type MembershipPackage = typeof membershipPackagesTable.$inferSelect;
export type NewMembershipPackage = typeof membershipPackagesTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;
export type Ad = typeof adsTable.$inferSelect;
export type NewAd = typeof adsTable.$inferInsert;
export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;
