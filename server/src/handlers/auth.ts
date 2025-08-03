
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type AuthResponse, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing (in production, use bcrypt or similar)
const hashPassword = (password: string): string => {
  return `hashed_${password}`;
};

// Simple password verification
const verifyPassword = (password: string, hash: string): boolean => {
  return hash === `hashed_${password}`;
};

// Simple JWT token generation (in production, use proper JWT library)
const generateToken = (userId: number): string => {
  return `token_${userId}_${Date.now()}`;
};

// Simple JWT token verification
const verifyToken = (token: string): number | null => {
  const match = token.match(/^token_(\d+)_\d+$/);
  return match ? parseInt(match[1], 10) : null;
};

export async function registerUser(input: CreateUserInput): Promise<AuthResponse> {
  try {
    // Check if user already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = hashPassword(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: passwordHash,
        full_name: input.full_name,
        phone: input.phone
      })
      .returning()
      .execute();

    const user = result[0];
    const token = generateToken(user.id);

    return {
      user: {
        ...user,
        boost_credits: user.boost_credits || 0
      },
      token
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(input.password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    const token = generateToken(user.id);

    return {
      user: {
        ...user,
        boost_credits: user.boost_credits || 0
      },
      token
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(token: string): Promise<User> {
  try {
    // Verify token and extract user ID
    const userId = verifyToken(token);
    if (!userId) {
      throw new Error('Invalid token');
    }

    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    return {
      ...user,
      boost_credits: user.boost_credits || 0
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}
