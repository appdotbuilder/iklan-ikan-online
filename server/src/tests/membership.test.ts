
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { membershipPackagesTable, usersTable } from '../db/schema';
import { type CreateMembershipPackageInput } from '../schema';
import {
  getMembershipPackages,
  createMembershipPackage,
  updateMembershipPackage,
  deactivateMembershipPackage,
  assignMembershipToUser
} from '../handlers/membership';
import { eq } from 'drizzle-orm';

const testPackageInput: CreateMembershipPackageInput = {
  name: 'Premium Package',
  description: 'Premium membership with extra features',
  price: 29.99,
  duration_days: 30,
  max_ads: 10,
  boost_credits: 5,
  features: ['unlimited_views', 'priority_support', 'advanced_analytics']
};

describe('Membership Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getMembershipPackages', () => {
    it('should return only active membership packages', async () => {
      // Create active package
      await createMembershipPackage(testPackageInput);

      // Create inactive package
      const inactivePackage = await createMembershipPackage({
        ...testPackageInput,
        name: 'Inactive Package'
      });
      await deactivateMembershipPackage(inactivePackage.id);

      const result = await getMembershipPackages();

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Premium Package');
      expect(result[0].is_active).toBe(true);
      expect(typeof result[0].price).toBe('number');
      expect(result[0].price).toEqual(29.99);
    });

    it('should return empty array when no active packages exist', async () => {
      const result = await getMembershipPackages();
      expect(result).toHaveLength(0);
    });
  });

  describe('createMembershipPackage', () => {
    it('should create a membership package with all fields', async () => {
      const result = await createMembershipPackage(testPackageInput);

      expect(result.name).toEqual('Premium Package');
      expect(result.description).toEqual(testPackageInput.description);
      expect(result.price).toEqual(29.99);
      expect(typeof result.price).toBe('number');
      expect(result.duration_days).toEqual(30);
      expect(result.max_ads).toEqual(10);
      expect(result.boost_credits).toEqual(5);
      expect(result.features).toEqual(['unlimited_views', 'priority_support', 'advanced_analytics']);
      expect(result.is_active).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save package to database correctly', async () => {
      const result = await createMembershipPackage(testPackageInput);

      const packages = await db.select()
        .from(membershipPackagesTable)
        .where(eq(membershipPackagesTable.id, result.id))
        .execute();

      expect(packages).toHaveLength(1);
      expect(packages[0].name).toEqual('Premium Package');
      expect(parseFloat(packages[0].price)).toEqual(29.99);
      expect(packages[0].features).toEqual(['unlimited_views', 'priority_support', 'advanced_analytics']);
    });
  });

  describe('updateMembershipPackage', () => {
    it('should update membership package fields', async () => {
      const created = await createMembershipPackage(testPackageInput);

      const updateInput = {
        name: 'Updated Premium Package',
        price: 39.99,
        max_ads: 15
      };

      const result = await updateMembershipPackage(created.id, updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Premium Package');
      expect(result.price).toEqual(39.99);
      expect(typeof result.price).toBe('number');
      expect(result.max_ads).toEqual(15);
      expect(result.description).toEqual(testPackageInput.description); // Unchanged
      expect(result.duration_days).toEqual(30); // Unchanged
    });

    it('should throw error when package not found', async () => {
      await expect(updateMembershipPackage(999, { name: 'New Name' }))
        .rejects.toThrow(/not found/i);
    });
  });

  describe('deactivateMembershipPackage', () => {
    it('should deactivate existing package', async () => {
      const created = await createMembershipPackage(testPackageInput);

      const result = await deactivateMembershipPackage(created.id);

      expect(result).toBe(true);

      // Verify package is deactivated
      const packages = await db.select()
        .from(membershipPackagesTable)
        .where(eq(membershipPackagesTable.id, created.id))
        .execute();

      expect(packages[0].is_active).toBe(false);
    });

    it('should return false when package not found', async () => {
      const result = await deactivateMembershipPackage(999);
      expect(result).toBe(false);
    });
  });

  describe('assignMembershipToUser', () => {
    it('should assign membership to user', async () => {
      // Create test user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test User'
        })
        .returning()
        .execute();
      const user = userResult[0];

      // Create membership package
      const membership = await createMembershipPackage(testPackageInput);

      const result = await assignMembershipToUser(user.id, membership.id);

      expect(result).toBe(true);

      // Verify assignment
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      expect(users[0].membership_id).toEqual(membership.id);
    });

    it('should throw error when user not found', async () => {
      const membership = await createMembershipPackage(testPackageInput);

      await expect(assignMembershipToUser(999, membership.id))
        .rejects.toThrow(/user not found/i);
    });

    it('should throw error when membership not found', async () => {
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test User'
        })
        .returning()
        .execute();
      const user = userResult[0];

      await expect(assignMembershipToUser(user.id, 999))
        .rejects.toThrow(/membership package not found/i);
    });

    it('should throw error when membership is inactive', async () => {
      // Create user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Test User'
        })
        .returning()
        .execute();
      const user = userResult[0];

      // Create and deactivate membership
      const membership = await createMembershipPackage(testPackageInput);
      await deactivateMembershipPackage(membership.id);

      await expect(assignMembershipToUser(user.id, membership.id))
        .rejects.toThrow(/membership package not found or inactive/i);
    });
  });
});
