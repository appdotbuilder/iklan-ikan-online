
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, usersTable, membershipPackagesTable, adsTable, categoriesTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { 
  createPayment, 
  handleMidtransCallback, 
  getUserPayments, 
  getAllPayments, 
  getPaymentById, 
  processSuccessfulPayment 
} from '../handlers/payments';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  full_name: 'Test User',
  phone: '1234567890',
  avatar_url: null,
  membership_id: null,
  boost_credits: 0,
  is_admin: false,
  is_active: true
};

const testMembership = {
  name: 'Premium Package',
  description: 'Premium membership',
  price: '99.99',
  duration_days: 30,
  max_ads: 10,
  boost_credits: 5,
  features: ['feature1', 'feature2'],
  is_active: true
};

const testCategory = {
  name: 'Electronics',
  description: 'Electronic items',
  icon_url: null,
  is_active: true
};

const testAd = {
  title: 'Test Ad',
  description: 'Test ad description',
  price: '100.00',
  location: 'Test Location',
  contact_info: 'test@contact.com',
  images: ['image1.jpg'],
  is_boosted: false,
  boost_expires_at: null,
  view_count: 0,
  contact_count: 0,
  status: 'active' as const,
  rejection_reason: null
};

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a membership payment', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const membershipResult = await db.insert(membershipPackagesTable).values(testMembership).returning().execute();
    const membershipId = membershipResult[0].id;

    const input: CreatePaymentInput = {
      membership_id: membershipId,
      ad_id: null,
      type: 'membership',
      amount: 99.99
    };

    const result = await createPayment(input, userId);

    expect(result.user_id).toEqual(userId);
    expect(result.membership_id).toEqual(membershipId);
    expect(result.ad_id).toBeNull();
    expect(result.type).toEqual('membership');
    expect(result.amount).toEqual(99.99);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a boost payment', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const categoryId = categoryResult[0].id;

    const adResult = await db.insert(adsTable).values({
      ...testAd,
      user_id: userId,
      category_id: categoryId
    }).returning().execute();
    const adId = adResult[0].id;

    const input: CreatePaymentInput = {
      membership_id: null,
      ad_id: adId,
      type: 'boost',
      amount: 50.00
    };

    const result = await createPayment(input, userId);

    expect(result.user_id).toEqual(userId);
    expect(result.membership_id).toBeNull();
    expect(result.ad_id).toEqual(adId);
    expect(result.type).toEqual('boost');
    expect(result.amount).toEqual(50.00);
    expect(result.status).toEqual('pending');
  });

  it('should save payment to database', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const membershipResult = await db.insert(membershipPackagesTable).values(testMembership).returning().execute();
    const membershipId = membershipResult[0].id;

    const input: CreatePaymentInput = {
      membership_id: membershipId,
      ad_id: null,
      type: 'membership',
      amount: 99.99
    };

    const result = await createPayment(input, userId);

    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].user_id).toEqual(userId);
    expect(parseFloat(payments[0].amount)).toEqual(99.99);
    expect(payments[0].status).toEqual('pending');
  });

  it('should throw error for non-existent user', async () => {
    const input: CreatePaymentInput = {
      membership_id: null,
      ad_id: null,
      type: 'boost',
      amount: 50.00
    };

    await expect(createPayment(input, 999)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for inactive membership', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const inactiveMembership = await db.insert(membershipPackagesTable).values({
      ...testMembership,
      is_active: false
    }).returning().execute();
    const membershipId = inactiveMembership[0].id;

    const input: CreatePaymentInput = {
      membership_id: membershipId,
      ad_id: null,
      type: 'membership',
      amount: 99.99
    };

    await expect(createPayment(input, userId)).rejects.toThrow(/membership package not found or inactive/i);
  });
});

describe('handleMidtransCallback', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should handle successful payment callback', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const paymentResult = await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: null,
      ad_id: null,
      type: 'boost',
      amount: '50.00',
      status: 'pending',
      midtrans_transaction_id: 'TXN123'
    }).returning().execute();

    const response = { order_id: 'ORDER123', transaction_status: 'settlement' };
    const result = await handleMidtransCallback('TXN123', 'settlement', response);

    expect(result).toBe(true);

    // Check payment status updated
    const updatedPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentResult[0].id))
      .execute();

    expect(updatedPayments[0].status).toEqual('paid');
    expect(updatedPayments[0].midtrans_response).toEqual(response);
  });

  it('should handle failed payment callback', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const paymentResult = await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: null,
      ad_id: null,
      type: 'boost',
      amount: '50.00',
      status: 'pending',
      midtrans_transaction_id: 'TXN124'
    }).returning().execute();

    const result = await handleMidtransCallback('TXN124', 'failure', { error: 'Payment failed' });

    expect(result).toBe(true);

    const updatedPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentResult[0].id))
      .execute();

    expect(updatedPayments[0].status).toEqual('failed');
  });

  it('should throw error for non-existent transaction', async () => {
    await expect(handleMidtransCallback('INVALID', 'settlement', {})).rejects.toThrow(/payment not found/i);
  });
});

describe('getUserPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get payments for specific user', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create payment for user
    await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: null,
      ad_id: null,
      type: 'boost',
      amount: '50.00',
      status: 'paid'
    }).execute();

    const result = await getUserPayments(userId);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].amount).toEqual(50.00);
    expect(typeof result[0].amount).toBe('number');
  });

  it('should return empty array for user with no payments', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const result = await getUserPayments(userId);

    expect(result).toHaveLength(0);
  });
});

describe('getAllPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all payments', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create multiple payments
    await db.insert(paymentsTable).values([
      {
        user_id: userId,
        membership_id: null,
        ad_id: null,
        type: 'boost',
        amount: '50.00',
        status: 'paid'
      },
      {
        user_id: userId,
        membership_id: null,
        ad_id: null,
        type: 'boost',
        amount: '25.00',
        status: 'pending'
      }
    ]).execute();

    const result = await getAllPayments();

    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach(payment => {
      expect(typeof payment.amount).toBe('number');
    });
  });
});

describe('getPaymentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get payment by ID', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const paymentResult = await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: null,
      ad_id: null,
      type: 'boost',
      amount: '75.00',
      status: 'paid'
    }).returning().execute();

    const result = await getPaymentById(paymentResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(paymentResult[0].id);
    expect(result!.amount).toEqual(75.00);
    expect(typeof result!.amount).toBe('number');
  });

  it('should return null for non-existent payment', async () => {
    const result = await getPaymentById(999);
    expect(result).toBeNull();
  });
});

describe('processSuccessfulPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process membership payment successfully', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const membershipResult = await db.insert(membershipPackagesTable).values(testMembership).returning().execute();
    const membershipId = membershipResult[0].id;

    const paymentResult = await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: membershipId,
      ad_id: null,
      type: 'membership',
      amount: '99.99',
      status: 'paid'
    }).returning().execute();

    const result = await processSuccessfulPayment(paymentResult[0].id);

    expect(result).toBe(true);

    // Check user membership updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers[0].membership_id).toEqual(membershipId);
    expect(updatedUsers[0].boost_credits).toEqual(5); // From membership package
  });

  it('should process boost payment successfully', async () => {
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const categoryId = categoryResult[0].id;

    const adResult = await db.insert(adsTable).values({
      ...testAd,
      user_id: userId,
      category_id: categoryId
    }).returning().execute();
    const adId = adResult[0].id;

    const paymentResult = await db.insert(paymentsTable).values({
      user_id: userId,
      membership_id: null,
      ad_id: adId,
      type: 'boost',
      amount: '50.00',
      status: 'paid'
    }).returning().execute();

    const result = await processSuccessfulPayment(paymentResult[0].id);

    expect(result).toBe(true);

    // Check boost credits added
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers[0].boost_credits).toEqual(50); // Credits based on payment amount
  });

  it('should throw error for non-existent payment', async () => {
    await expect(processSuccessfulPayment(999)).rejects.toThrow(/payment not found/i);
  });
});
