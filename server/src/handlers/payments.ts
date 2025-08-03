
import { db } from '../db';
import { paymentsTable, usersTable, membershipPackagesTable, adsTable } from '../db/schema';
import { type Payment, type CreatePaymentInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createPayment(input: CreatePaymentInput, userId: number): Promise<Payment> {
  try {
    // Validate user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    // Validate foreign key constraints based on payment type
    if (input.type === 'membership' && input.membership_id) {
      const memberships = await db.select()
        .from(membershipPackagesTable)
        .where(and(
          eq(membershipPackagesTable.id, input.membership_id),
          eq(membershipPackagesTable.is_active, true)
        ))
        .execute();

      if (memberships.length === 0) {
        throw new Error('Membership package not found or inactive');
      }
    }

    if (input.type === 'boost' && input.ad_id) {
      const ads = await db.select()
        .from(adsTable)
        .where(and(
          eq(adsTable.id, input.ad_id),
          eq(adsTable.user_id, userId)
        ))
        .execute();

      if (ads.length === 0) {
        throw new Error('Ad not found or not owned by user');
      }
    }

    // Create payment record
    const result = await db.insert(paymentsTable)
      .values({
        user_id: userId,
        membership_id: input.membership_id,
        ad_id: input.ad_id,
        type: input.type,
        amount: input.amount.toString(),
        status: 'pending'
      })
      .returning()
      .execute();

    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      midtrans_response: payment.midtrans_response as Record<string, any> | null
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}

export async function handleMidtransCallback(transactionId: string, status: string, response: any): Promise<boolean> {
  try {
    // Find payment by transaction ID
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.midtrans_transaction_id, transactionId))
      .execute();

    if (payments.length === 0) {
      throw new Error('Payment not found for transaction ID');
    }

    const payment = payments[0];

    // Map Midtrans status to our payment status
    let paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled';
    switch (status) {
      case 'settlement':
      case 'capture':
        paymentStatus = 'paid';
        break;
      case 'deny':
      case 'expire':
      case 'failure':
        paymentStatus = 'failed';
        break;
      case 'cancel':
        paymentStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'pending';
    }

    // Update payment status and response
    await db.update(paymentsTable)
      .set({
        status: paymentStatus,
        midtrans_response: response,
        updated_at: new Date()
      })
      .where(eq(paymentsTable.id, payment.id))
      .execute();

    // Process successful payment
    if (paymentStatus === 'paid') {
      await processSuccessfulPayment(payment.id);
    }

    return true;
  } catch (error) {
    console.error('Midtrans callback handling failed:', error);
    throw error;
  }
}

export async function getUserPayments(userId: number): Promise<Payment[]> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.user_id, userId))
      .execute();

    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount),
      midtrans_response: payment.midtrans_response as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Get user payments failed:', error);
    throw error;
  }
}

export async function getAllPayments(): Promise<Payment[]> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .execute();

    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount),
      midtrans_response: payment.midtrans_response as Record<string, any> | null
    }));
  } catch (error) {
    console.error('Get all payments failed:', error);
    throw error;
  }
}

export async function getPaymentById(id: number): Promise<Payment | null> {
  try {
    const results = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const payment = results[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      midtrans_response: payment.midtrans_response as Record<string, any> | null
    };
  } catch (error) {
    console.error('Get payment by ID failed:', error);
    throw error;
  }
}

export async function processSuccessfulPayment(paymentId: number): Promise<boolean> {
  try {
    // Get payment details
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, paymentId))
      .execute();

    if (payments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = payments[0];

    if (payment.type === 'membership' && payment.membership_id) {
      // Assign membership to user
      await db.update(usersTable)
        .set({
          membership_id: payment.membership_id,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, payment.user_id))
        .execute();

      // Get membership details to add boost credits
      const memberships = await db.select()
        .from(membershipPackagesTable)
        .where(eq(membershipPackagesTable.id, payment.membership_id))
        .execute();

      if (memberships.length > 0) {
        const membership = memberships[0];
        
        // Add boost credits to user
        const users = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, payment.user_id))
          .execute();

        if (users.length > 0) {
          const currentCredits = users[0].boost_credits;
          await db.update(usersTable)
            .set({
              boost_credits: currentCredits + membership.boost_credits,
              updated_at: new Date()
            })
            .where(eq(usersTable.id, payment.user_id))
            .execute();
        }
      }
    } else if (payment.type === 'boost' && payment.ad_id) {
      // Add boost credits for ad boost payment
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, payment.user_id))
        .execute();

      if (users.length > 0) {
        const currentCredits = users[0].boost_credits;
        // Assume 1 boost credit per payment amount (can be adjusted)
        const creditsToAdd = Math.floor(parseFloat(payment.amount));
        
        await db.update(usersTable)
          .set({
            boost_credits: currentCredits + creditsToAdd,
            updated_at: new Date()
          })
          .where(eq(usersTable.id, payment.user_id))
          .execute();
      }
    }

    return true;
  } catch (error) {
    console.error('Process successful payment failed:', error);
    throw error;
  }
}
