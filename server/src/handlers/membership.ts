
import { db } from '../db';
import { membershipPackagesTable, usersTable } from '../db/schema';
import { type MembershipPackage, type CreateMembershipPackageInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getMembershipPackages(): Promise<MembershipPackage[]> {
  try {
    const results = await db.select()
      .from(membershipPackagesTable)
      .where(eq(membershipPackagesTable.is_active, true))
      .execute();

    return results.map(pkg => ({
      ...pkg,
      price: parseFloat(pkg.price) // Convert numeric string back to number
    }));
  } catch (error) {
    console.error('Failed to get membership packages:', error);
    throw error;
  }
}

export async function createMembershipPackage(input: CreateMembershipPackageInput): Promise<MembershipPackage> {
  try {
    const result = await db.insert(membershipPackagesTable)
      .values({
        name: input.name,
        description: input.description,
        price: input.price.toString(), // Convert number to string for numeric column
        duration_days: input.duration_days,
        max_ads: input.max_ads,
        boost_credits: input.boost_credits,
        features: input.features
      })
      .returning()
      .execute();

    const pkg = result[0];
    return {
      ...pkg,
      price: parseFloat(pkg.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to create membership package:', error);
    throw error;
  }
}

export async function updateMembershipPackage(id: number, input: Partial<CreateMembershipPackageInput>): Promise<MembershipPackage> {
  try {
    // Build update values, converting numeric fields if present
    const updateValues: any = { ...input };
    if (input.price !== undefined) {
      updateValues.price = input.price.toString();
    }

    const result = await db.update(membershipPackagesTable)
      .set(updateValues)
      .where(eq(membershipPackagesTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Membership package not found');
    }

    const pkg = result[0];
    return {
      ...pkg,
      price: parseFloat(pkg.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to update membership package:', error);
    throw error;
  }
}

export async function deactivateMembershipPackage(id: number): Promise<boolean> {
  try {
    const result = await db.update(membershipPackagesTable)
      .set({ is_active: false })
      .where(eq(membershipPackagesTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to deactivate membership package:', error);
    throw error;
  }
}

export async function assignMembershipToUser(userId: number, membershipId: number): Promise<boolean> {
  try {
    // Verify membership package exists and is active
    const membershipResult = await db.select()
      .from(membershipPackagesTable)
      .where(and(
        eq(membershipPackagesTable.id, membershipId),
        eq(membershipPackagesTable.is_active, true)
      ))
      .execute();

    if (membershipResult.length === 0) {
      throw new Error('Membership package not found or inactive');
    }

    // Verify user exists
    const userResult = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    // Assign membership to user
    const result = await db.update(usersTable)
      .set({ membership_id: membershipId })
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Failed to assign membership to user:', error);
    throw error;
  }
}
