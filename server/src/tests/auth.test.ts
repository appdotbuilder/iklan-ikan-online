
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { registerUser, loginUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test inputs
const testCreateUserInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  phone: '+1234567890'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testCreateUserInput);

    // Validate return structure
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');

    // Validate user fields
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.phone).toEqual('+1234567890');
    expect(result.user.id).toBeDefined();
    expect(result.user.boost_credits).toEqual(0);
    expect(result.user.is_admin).toBe(false);
    expect(result.user.is_active).toBe(true);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testCreateUserInput);

    // Query database directly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].password_hash).toContain('hashed_');
    expect(users[0].is_active).toBe(true);
  });

  it('should reject duplicate email', async () => {
    // Register first user
    await registerUser(testCreateUserInput);

    // Try to register same email again
    await expect(registerUser(testCreateUserInput))
      .rejects.toThrow(/already exists/i);
  });

  it('should handle user with null phone', async () => {
    const input: CreateUserInput = {
      ...testCreateUserInput,
      phone: null
    };

    const result = await registerUser(input);

    expect(result.user.phone).toBeNull();
    expect(result.user.email).toEqual('test@example.com');
  });
});

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login existing user', async () => {
    // Register user first
    await registerUser(testCreateUserInput);

    // Login with same credentials
    const result = await loginUser(testLoginInput);

    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
  });

  it('should reject invalid email', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidInput))
      .rejects.toThrow(/invalid credentials/i);
  });

  it('should reject invalid password', async () => {
    // Register user first
    await registerUser(testCreateUserInput);

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput))
      .rejects.toThrow(/invalid credentials/i);
  });

  it('should reject inactive user', async () => {
    // Register user first
    const registered = await registerUser(testCreateUserInput);

    // Deactivate user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, registered.user.id))
      .execute();

    await expect(loginUser(testLoginInput))
      .rejects.toThrow(/inactive/i);
  });
});

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return current user for valid token', async () => {
    // Register user first
    const registered = await registerUser(testCreateUserInput);

    // Get current user with token
    const result = await getCurrentUser(registered.token);

    expect(result.id).toEqual(registered.user.id);
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.is_active).toBe(true);
  });

  it('should reject invalid token', async () => {
    await expect(getCurrentUser('invalid_token'))
      .rejects.toThrow(/invalid token/i);
  });

  it('should reject token for non-existent user', async () => {
    const fakeToken = 'token_99999_123456789';

    await expect(getCurrentUser(fakeToken))
      .rejects.toThrow(/not found/i);
  });

  it('should reject token for inactive user', async () => {
    // Register user first
    const registered = await registerUser(testCreateUserInput);

    // Deactivate user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, registered.user.id))
      .execute();

    await expect(getCurrentUser(registered.token))
      .rejects.toThrow(/inactive/i);
  });
});
