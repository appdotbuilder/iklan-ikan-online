
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, adsTable } from '../db/schema';
import { type CreateAdInput, type UpdateAdInput, type GetAdsInput, type BoostAdInput, type ModerateAdInput } from '../schema';
import { 
  getAds, 
  getAdById, 
  getUserAds, 
  createAd, 
  updateAd, 
  deleteAd, 
  boostAd, 
  moderateAd, 
  incrementContactCount 
} from '../handlers/ads';
import { eq } from 'drizzle-orm';

describe('ads handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testAdId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        boost_credits: 5
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic items'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test ad
    const adResult = await db.insert(adsTable)
      .values({
        user_id: testUserId,
        category_id: testCategoryId,
        title: 'Test Ad',
        description: 'Test description',
        price: '100.00',
        location: 'Test Location',
        contact_info: 'test@contact.com',
        images: ['image1.jpg'],
        status: 'active'
      })
      .returning()
      .execute();
    testAdId = adResult[0].id;
  });

  describe('getAds', () => {
    it('should fetch active ads', async () => {
      const input: GetAdsInput = {};
      const result = await getAds(input);

      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Test Ad');
      expect(result[0].price).toEqual(100);
      expect(typeof result[0].price).toEqual('number');
    });

    it('should filter by category', async () => {
      const input: GetAdsInput = { category_id: testCategoryId };
      const result = await getAds(input);

      expect(result).toHaveLength(1);
      expect(result[0].category_id).toEqual(testCategoryId);
    });

    it('should filter by user', async () => {
      const input: GetAdsInput = { user_id: testUserId };
      const result = await getAds(input);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toEqual(testUserId);
    });

    it('should search in title and description', async () => {
      const input: GetAdsInput = { search: 'Test Ad' };
      const result = await getAds(input);

      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Test Ad');
    });

    it('should filter by price range', async () => {
      const input: GetAdsInput = { min_price: 50, max_price: 150 };
      const result = await getAds(input);

      expect(result).toHaveLength(1);
      expect(result[0].price).toEqual(100);
    });

    it('should apply pagination', async () => {
      const input: GetAdsInput = { limit: 1, offset: 0 };
      const result = await getAds(input);

      expect(result).toHaveLength(1);
    });

    it('should prioritize boosted ads', async () => {
      // Create boosted ad
      await db.insert(adsTable)
        .values({
          user_id: testUserId,
          category_id: testCategoryId,
          title: 'Boosted Ad',
          description: 'Boosted description',
          price: '200.00',
          location: 'Boosted Location',
          contact_info: 'boosted@contact.com',
          images: [],
          status: 'active',
          is_boosted: true,
          boost_expires_at: new Date(Date.now() + 86400000) // 1 day from now
        })
        .execute();

      const result = await getAds({});

      expect(result).toHaveLength(2);
      expect(result[0].title).toEqual('Boosted Ad');
      expect(result[0].is_boosted).toBe(true);
    });
  });

  describe('getAdById', () => {
    it('should fetch ad by ID and increment view count', async () => {
      const result = await getAdById(testAdId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(testAdId);
      expect(result!.view_count).toEqual(1);
      expect(result!.price).toEqual(100);
      expect(typeof result!.price).toEqual('number');
    });

    it('should return null for non-existent ad', async () => {
      const result = await getAdById(999);
      expect(result).toBeNull();
    });
  });

  describe('getUserAds', () => {
    it('should fetch all ads for a user', async () => {
      const result = await getUserAds(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toEqual(testUserId);
      expect(result[0].price).toEqual(100);
      expect(typeof result[0].price).toEqual('number');
    });

    it('should return empty array for user with no ads', async () => {
      // Create another user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();

      const result = await getUserAds(userResult[0].id);
      expect(result).toHaveLength(0);
    });
  });

  describe('createAd', () => {
    it('should create a new ad', async () => {
      const input: CreateAdInput = {
        category_id: testCategoryId,
        title: 'New Ad',
        description: 'New description',
        price: 250.50,
        location: 'New Location',
        contact_info: 'new@contact.com',
        images: ['new1.jpg', 'new2.jpg']
      };

      const result = await createAd(input, testUserId);

      expect(result.title).toEqual('New Ad');
      expect(result.description).toEqual('New description');
      expect(result.price).toEqual(250.50);
      expect(typeof result.price).toEqual('number');
      expect(result.user_id).toEqual(testUserId);
      expect(result.category_id).toEqual(testCategoryId);
      expect(result.status).toEqual('draft');
      expect(result.images).toEqual(['new1.jpg', 'new2.jpg']);
    });

    it('should throw error for non-existent user', async () => {
      const input: CreateAdInput = {
        category_id: testCategoryId,
        title: 'New Ad',
        description: 'New description',
        price: 250.50,
        location: 'New Location',
        contact_info: 'new@contact.com',
        images: []
      };

      await expect(createAd(input, 999)).rejects.toThrow(/user not found/i);
    });

    it('should throw error for non-existent category', async () => {
      const input: CreateAdInput = {
        category_id: 999,
        title: 'New Ad',
        description: 'New description',
        price: 250.50,
        location: 'New Location',
        contact_info: 'new@contact.com',
        images: []
      };

      await expect(createAd(input, testUserId)).rejects.toThrow(/category not found/i);
    });
  });

  describe('updateAd', () => {
    it('should update an ad', async () => {
      const input: UpdateAdInput = {
        id: testAdId,
        title: 'Updated Ad',
        price: 150.75
      };

      const result = await updateAd(input, testUserId);

      expect(result.title).toEqual('Updated Ad');
      expect(result.price).toEqual(150.75);
      expect(typeof result.price).toEqual('number');
      expect(result.description).toEqual('Test description'); // Unchanged
    });

    it('should throw error for non-existent ad', async () => {
      const input: UpdateAdInput = {
        id: 999,
        title: 'Updated Ad'
      };

      await expect(updateAd(input, testUserId)).rejects.toThrow(/ad not found/i);
    });

    it('should throw error for unauthorized user', async () => {
      // Create another user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();

      const input: UpdateAdInput = {
        id: testAdId,
        title: 'Updated Ad'
      };

      await expect(updateAd(input, userResult[0].id)).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('deleteAd', () => {
    it('should soft delete an ad by owner', async () => {
      const result = await deleteAd(testAdId, testUserId);
      expect(result).toBe(true);

      // Verify ad is marked as deleted
      const ads = await db.select()
        .from(adsTable)
        .where(eq(adsTable.id, testAdId))
        .execute();

      expect(ads[0].status).toEqual('deleted');
    });

    it('should delete ad by admin', async () => {
      // Create admin user
      const adminResult = await db.insert(usersTable)
        .values({
          email: 'admin@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Admin User',
          is_admin: true
        })
        .returning()
        .execute();

      const result = await deleteAd(testAdId, adminResult[0].id);
      expect(result).toBe(true);
    });

    it('should throw error for non-existent ad', async () => {
      await expect(deleteAd(999, testUserId)).rejects.toThrow(/ad not found/i);
    });

    it('should throw error for unauthorized user', async () => {
      // Create another non-admin user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();

      await expect(deleteAd(testAdId, userResult[0].id)).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('boostAd', () => {
    it('should boost an ad using credits', async () => {
      const input: BoostAdInput = {
        ad_id: testAdId,
        duration_days: 7
      };

      const result = await boostAd(input, testUserId);

      expect(result.is_boosted).toBe(true);
      expect(result.boost_expires_at).toBeInstanceOf(Date);
      expect(result.price).toEqual(100);
      expect(typeof result.price).toEqual('number');

      // Verify user credits were deducted
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, testUserId))
        .execute();
      expect(users[0].boost_credits).toEqual(4);
    });

    it('should throw error for insufficient credits', async () => {
      // Update user to have 0 credits
      await db.update(usersTable)
        .set({ boost_credits: 0 })
        .where(eq(usersTable.id, testUserId))
        .execute();

      const input: BoostAdInput = {
        ad_id: testAdId,
        duration_days: 7
      };

      await expect(boostAd(input, testUserId)).rejects.toThrow(/insufficient boost credits/i);
    });

    it('should throw error for unauthorized user', async () => {
      // Create another user
      const userResult = await db.insert(usersTable)
        .values({
          email: 'other@example.com',
          password_hash: 'hashedpassword',
          full_name: 'Other User'
        })
        .returning()
        .execute();

      const input: BoostAdInput = {
        ad_id: testAdId,
        duration_days: 7
      };

      await expect(boostAd(input, userResult[0].id)).rejects.toThrow(/unauthorized/i);
    });
  });

  describe('moderateAd', () => {
    it('should approve an ad', async () => {
      const input: ModerateAdInput = {
        ad_id: testAdId,
        status: 'active',
        rejection_reason: null
      };

      const result = await moderateAd(input);

      expect(result.status).toEqual('active');
      expect(result.rejection_reason).toBeNull();
      expect(result.price).toEqual(100);
      expect(typeof result.price).toEqual('number');
    });

    it('should reject an ad with reason', async () => {
      const input: ModerateAdInput = {
        ad_id: testAdId,
        status: 'rejected',
        rejection_reason: 'Inappropriate content'
      };

      const result = await moderateAd(input);

      expect(result.status).toEqual('rejected');
      expect(result.rejection_reason).toEqual('Inappropriate content');
    });

    it('should throw error for non-existent ad', async () => {
      const input: ModerateAdInput = {
        ad_id: 999,
        status: 'active',
        rejection_reason: null
      };

      await expect(moderateAd(input)).rejects.toThrow(/ad not found/i);
    });
  });

  describe('incrementContactCount', () => {
    it('should increment contact count', async () => {
      const result = await incrementContactCount(testAdId);
      expect(result).toBe(true);

      // Verify count was incremented
      const ads = await db.select()
        .from(adsTable)
        .where(eq(adsTable.id, testAdId))
        .execute();

      expect(ads[0].contact_count).toEqual(1);
    });

    it('should throw error for non-existent ad', async () => {
      await expect(incrementContactCount(999)).rejects.toThrow(/ad not found/i);
    });
  });
});
