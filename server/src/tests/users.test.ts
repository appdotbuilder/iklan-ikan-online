
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersInput, type UpdateUserInput } from '../schema';
import { getUsers, getUserById, updateUser, deactivateUser, activateUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test user data
const testUser1 = {
  email: 'john@example.com',
  password_hash: 'hashed_password_1',
  full_name: 'John Doe',
  phone: '1234567890',
  avatar_url: 'https://example.com/avatar1.jpg',
  membership_id: null,
  boost_credits: 10,
  is_admin: false,
  is_active: true
};

const testUser2 = {
  email: 'jane@example.com',
  password_hash: 'hashed_password_2',
  full_name: 'Jane Smith',
  phone: '0987654321',
  avatar_url: null,
  membership_id: null,
  boost_credits: 5,
  is_admin: true,
  is_active: true
};

const testUser3 = {
  email: 'inactive@example.com',
  password_hash: 'hashed_password_3',
  full_name: 'Inactive User',
  phone: null,
  avatar_url: null,
  membership_id: null,
  boost_credits: 0,
  is_admin: false,
  is_active: false
};

describe('Users handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getUsers', () => {
    it('should return all users with no filters', async () => {
      // Create test users
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = {};
      const result = await getUsers(input);

      expect(result).toHaveLength(3);
      expect(result[0].email).toEqual('john@example.com');
      expect(result[1].email).toEqual('jane@example.com');
      expect(result[2].email).toEqual('inactive@example.com');
    });

    it('should filter users by search term', async () => {
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = { search: 'john' };
      const result = await getUsers(input);

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toEqual('John Doe');
    });

    it('should filter users by admin status', async () => {
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = { is_admin: true };
      const result = await getUsers(input);

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toEqual('Jane Smith');
      expect(result[0].is_admin).toBe(true);
    });

    it('should filter users by active status', async () => {
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = { is_active: false };
      const result = await getUsers(input);

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toEqual('Inactive User');
      expect(result[0].is_active).toBe(false);
    });

    it('should apply pagination', async () => {
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = { limit: 2, offset: 1 };
      const result = await getUsers(input);

      expect(result).toHaveLength(2);
      expect(result[0].email).toEqual('jane@example.com');
      expect(result[1].email).toEqual('inactive@example.com');
    });

    it('should combine multiple filters', async () => {
      await db.insert(usersTable).values([testUser1, testUser2, testUser3]).execute();

      const input: GetUsersInput = { is_active: true, is_admin: false };
      const result = await getUsers(input);

      expect(result).toHaveLength(1);
      expect(result[0].full_name).toEqual('John Doe');
      expect(result[0].is_active).toBe(true);
      expect(result[0].is_admin).toBe(false);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const users = await db.insert(usersTable).values(testUser1).returning().execute();
      const userId = users[0].id;

      const result = await getUserById(userId);

      expect(result).not.toBeNull();
      expect(result!.email).toEqual('john@example.com');
      expect(result!.full_name).toEqual('John Doe');
      expect(result!.boost_credits).toEqual(10);
    });

    it('should return null for non-existent user', async () => {
      const result = await getUserById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const users = await db.insert(usersTable).values(testUser1).returning().execute();
      const userId = users[0].id;

      const input: UpdateUserInput = {
        id: userId,
        full_name: 'John Updated',
        phone: '9999999999',
        avatar_url: 'https://example.com/new-avatar.jpg'
      };

      const result = await updateUser(input);

      expect(result.full_name).toEqual('John Updated');
      expect(result.phone).toEqual('9999999999');
      expect(result.avatar_url).toEqual('https://example.com/new-avatar.jpg');
      expect(result.email).toEqual('john@example.com'); // Should remain unchanged
    });

    it('should update only provided fields', async () => {
      const users = await db.insert(usersTable).values(testUser1).returning().execute();
      const userId = users[0].id;

      const input: UpdateUserInput = {
        id: userId,
        full_name: 'John Partial Update'
      };

      const result = await updateUser(input);

      expect(result.full_name).toEqual('John Partial Update');
      expect(result.phone).toEqual('1234567890'); // Should remain unchanged
      expect(result.avatar_url).toEqual('https://example.com/avatar1.jpg'); // Should remain unchanged
    });

    it('should throw error for non-existent user', async () => {
      const input: UpdateUserInput = {
        id: 999,
        full_name: 'Non-existent User'
      };

      await expect(updateUser(input)).rejects.toThrow(/user not found/i);
    });

    it('should update user in database', async () => {
      const users = await db.insert(usersTable).values(testUser1).returning().execute();
      const userId = users[0].id;

      const input: UpdateUserInput = {
        id: userId,
        full_name: 'John Database Check'
      };

      await updateUser(input);

      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].full_name).toEqual('John Database Check');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const users = await db.insert(usersTable).values(testUser1).returning().execute();
      const userId = users[0].id;

      const result = await deactivateUser(userId);

      expect(result).toBe(true);

      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(dbUsers[0].is_active).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await deactivateUser(999);

      expect(result).toBe(false);
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      const users = await db.insert(usersTable).values(testUser3).returning().execute();
      const userId = users[0].id;

      const result = await activateUser(userId);

      expect(result).toBe(true);

      const dbUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();

      expect(dbUsers[0].is_active).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      const result = await activateUser(999);

      expect(result).toBe(false);
    });
  });
});
