
import { db } from '../db';
import { adsTable, usersTable, categoriesTable } from '../db/schema';
import { type Ad, type CreateAdInput, type UpdateAdInput, type GetAdsInput, type BoostAdInput, type ModerateAdInput } from '../schema';
import { eq, and, or, like, gte, lte, desc, SQL } from 'drizzle-orm';

export async function getAds(input: GetAdsInput): Promise<Ad[]> {
  try {
    const conditions: SQL<unknown>[] = [];

    // Only show active ads
    conditions.push(eq(adsTable.status, 'active'));

    if (input.category_id) {
      conditions.push(eq(adsTable.category_id, input.category_id));
    }

    if (input.user_id) {
      conditions.push(eq(adsTable.user_id, input.user_id));
    }

    if (input.search) {
      conditions.push(
        or(
          like(adsTable.title, `%${input.search}%`),
          like(adsTable.description, `%${input.search}%`)
        )!
      );
    }

    if (input.location) {
      conditions.push(like(adsTable.location, `%${input.location}%`));
    }

    if (input.min_price !== undefined) {
      conditions.push(gte(adsTable.price, input.min_price.toString()));
    }

    if (input.max_price !== undefined) {
      conditions.push(lte(adsTable.price, input.max_price.toString()));
    }

    // Build final query in one go to avoid type inference issues
    const baseQuery = db.select().from(adsTable);
    const whereQuery = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    const orderedQuery = whereQuery.orderBy(desc(adsTable.is_boosted), desc(adsTable.created_at));
    
    const limitedQuery = input.limit 
      ? orderedQuery.limit(input.limit)
      : orderedQuery;
    
    const finalQuery = input.offset 
      ? limitedQuery.offset(input.offset)
      : limitedQuery;

    const results = await finalQuery.execute();

    return results.map(ad => ({
      ...ad,
      price: parseFloat(ad.price)
    }));
  } catch (error) {
    console.error('Failed to fetch ads:', error);
    throw error;
  }
}

export async function getAdById(id: number): Promise<Ad | null> {
  try {
    // First get the ad
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, id))
      .execute();

    if (ads.length === 0) {
      return null;
    }

    const ad = ads[0];

    // Increment view count
    await db.update(adsTable)
      .set({ view_count: ad.view_count + 1 })
      .where(eq(adsTable.id, id))
      .execute();

    return {
      ...ad,
      price: parseFloat(ad.price),
      view_count: ad.view_count + 1
    };
  } catch (error) {
    console.error('Failed to fetch ad by ID:', error);
    throw error;
  }
}

export async function getUserAds(userId: number): Promise<Ad[]> {
  try {
    const results = await db.select()
      .from(adsTable)
      .where(eq(adsTable.user_id, userId))
      .orderBy(desc(adsTable.created_at))
      .execute();

    return results.map(ad => ({
      ...ad,
      price: parseFloat(ad.price)
    }));
  } catch (error) {
    console.error('Failed to fetch user ads:', error);
    throw error;
  }
}

export async function createAd(input: CreateAdInput, userId: number): Promise<Ad> {
  try {
    // Verify user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Verify category exists
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (categories.length === 0) {
      throw new Error('Category not found');
    }

    const result = await db.insert(adsTable)
      .values({
        user_id: userId,
        category_id: input.category_id,
        title: input.title,
        description: input.description,
        price: input.price.toString(),
        location: input.location,
        contact_info: input.contact_info,
        images: input.images
      })
      .returning()
      .execute();

    const ad = result[0];
    return {
      ...ad,
      price: parseFloat(ad.price)
    };
  } catch (error) {
    console.error('Failed to create ad:', error);
    throw error;
  }
}

export async function updateAd(input: UpdateAdInput, userId: number): Promise<Ad> {
  try {
    // First check if ad exists and belongs to user
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, input.id))
      .execute();

    if (ads.length === 0) {
      throw new Error('Ad not found');
    }

    const ad = ads[0];
    if (ad.user_id !== userId) {
      throw new Error('Unauthorized - ad does not belong to user');
    }

    // Build update values
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.price !== undefined) {
      updateValues.price = input.price.toString();
    }
    if (input.location !== undefined) {
      updateValues.location = input.location;
    }
    if (input.contact_info !== undefined) {
      updateValues.contact_info = input.contact_info;
    }
    if (input.images !== undefined) {
      updateValues.images = input.images;
    }

    const result = await db.update(adsTable)
      .set(updateValues)
      .where(eq(adsTable.id, input.id))
      .returning()
      .execute();

    const updatedAd = result[0];
    return {
      ...updatedAd,
      price: parseFloat(updatedAd.price)
    };
  } catch (error) {
    console.error('Failed to update ad:', error);
    throw error;
  }
}

export async function deleteAd(id: number, userId: number): Promise<boolean> {
  try {
    // First check if ad exists and belongs to user (or user is admin)
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, id))
      .execute();

    if (ads.length === 0) {
      throw new Error('Ad not found');
    }

    const ad = ads[0];

    // Check if user owns the ad or is admin
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    if (ad.user_id !== userId && !user.is_admin) {
      throw new Error('Unauthorized - cannot delete this ad');
    }

    // Soft delete by setting status to 'deleted'
    await db.update(adsTable)
      .set({ 
        status: 'deleted',
        updated_at: new Date()
      })
      .where(eq(adsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to delete ad:', error);
    throw error;
  }
}

export async function boostAd(input: BoostAdInput, userId: number): Promise<Ad> {
  try {
    // First check if ad exists and belongs to user
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, input.ad_id))
      .execute();

    if (ads.length === 0) {
      throw new Error('Ad not found');
    }

    const ad = ads[0];
    if (ad.user_id !== userId) {
      throw new Error('Unauthorized - ad does not belong to user');
    }

    // Check if user has boost credits
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    if (user.boost_credits < 1) {
      throw new Error('Insufficient boost credits');
    }

    // Calculate boost expiry
    const boostExpiry = new Date();
    boostExpiry.setDate(boostExpiry.getDate() + input.duration_days);

    // Update ad with boost
    const result = await db.update(adsTable)
      .set({
        is_boosted: true,
        boost_expires_at: boostExpiry,
        updated_at: new Date()
      })
      .where(eq(adsTable.id, input.ad_id))
      .returning()
      .execute();

    // Deduct boost credit from user
    await db.update(usersTable)
      .set({ boost_credits: user.boost_credits - 1 })
      .where(eq(usersTable.id, userId))
      .execute();

    const boostedAd = result[0];
    return {
      ...boostedAd,
      price: parseFloat(boostedAd.price)
    };
  } catch (error) {
    console.error('Failed to boost ad:', error);
    throw error;
  }
}

export async function moderateAd(input: ModerateAdInput): Promise<Ad> {
  try {
    // Check if ad exists
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, input.ad_id))
      .execute();

    if (ads.length === 0) {
      throw new Error('Ad not found');
    }

    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    if (input.rejection_reason !== undefined) {
      updateValues.rejection_reason = input.rejection_reason;
    }

    const result = await db.update(adsTable)
      .set(updateValues)
      .where(eq(adsTable.id, input.ad_id))
      .returning()
      .execute();

    const moderatedAd = result[0];
    return {
      ...moderatedAd,
      price: parseFloat(moderatedAd.price)
    };
  } catch (error) {
    console.error('Failed to moderate ad:', error);
    throw error;
  }
}

export async function incrementContactCount(id: number): Promise<boolean> {
  try {
    // Check if ad exists
    const ads = await db.select()
      .from(adsTable)
      .where(eq(adsTable.id, id))
      .execute();

    if (ads.length === 0) {
      throw new Error('Ad not found');
    }

    const ad = ads[0];

    // Increment contact count
    await db.update(adsTable)
      .set({ contact_count: ad.contact_count + 1 })
      .where(eq(adsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to increment contact count:', error);
    throw error;
  }
}
