
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type UpdateUserInput, type GetUsersInput } from '../schema';
import { eq, and, or, ilike, SQL } from 'drizzle-orm';

export async function getUsers(input: GetUsersInput): Promise<User[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    if (input.search) {
      conditions.push(
        or(
          ilike(usersTable.full_name, `%${input.search}%`),
          ilike(usersTable.email, `%${input.search}%`)
        )!
      );
    }

    if (input.is_admin !== undefined) {
      conditions.push(eq(usersTable.is_admin, input.is_admin));
    }

    if (input.is_active !== undefined) {
      conditions.push(eq(usersTable.is_active, input.is_active));
    }

    // Build the complete query in one statement
    const baseQuery = db.select().from(usersTable);
    
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const limitQuery = input.limit ? whereQuery.limit(input.limit) : whereQuery;
    const finalQuery = input.offset ? limitQuery.offset(input.offset) : limitQuery;

    const results = await finalQuery.execute();

    return results.map(user => ({
      ...user,
      boost_credits: user.boost_credits
    }));
  } catch (error) {
    console.error('Failed to get users:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const results = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      ...user,
      boost_credits: user.boost_credits
    };
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }

    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }

    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }

    const results = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('User not found');
    }

    const user = results[0];
    return {
      ...user,
      boost_credits: user.boost_credits
    };
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

export async function deactivateUser(id: number): Promise<boolean> {
  try {
    const results = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    throw error;
  }
}

export async function activateUser(id: number): Promise<boolean> {
  try {
    const results = await db.update(usersTable)
      .set({ 
        is_active: true,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return results.length > 0;
  } catch (error) {
    console.error('Failed to activate user:', error);
    throw error;
  }
}
