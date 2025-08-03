
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  updateUserInputSchema,
  getUsersInputSchema,
  createCategoryInputSchema,
  createAdInputSchema,
  updateAdInputSchema,
  getAdsInputSchema,
  boostAdInputSchema,
  moderateAdInputSchema,
  createMembershipPackageInputSchema,
  createPaymentInputSchema
} from './schema';

// Import handlers
import { registerUser, loginUser, getCurrentUser } from './handlers/auth';
import { getUsers, getUserById, updateUser, deactivateUser, activateUser } from './handlers/users';
import { getCategories, createCategory, updateCategory, deleteCategory } from './handlers/categories';
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
} from './handlers/ads';
import { 
  getMembershipPackages, 
  createMembershipPackage, 
  updateMembershipPackage, 
  deactivateMembershipPackage, 
  assignMembershipToUser 
} from './handlers/membership';
import { 
  createPayment, 
  handleMidtransCallback, 
  getUserPayments, 
  getAllPayments, 
  getPaymentById, 
  processSuccessfulPayment 
} from './handlers/payments';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Auth routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),
  
  getCurrentUser: publicProcedure
    .input(z.string())
    .query(({ input }) => getCurrentUser(input)),

  // User management routes
  getUsers: publicProcedure
    .input(getUsersInputSchema)
    .query(({ input }) => getUsers(input)),
  
  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),
  
  deactivateUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deactivateUser(input)),
  
  activateUser: publicProcedure
    .input(z.number())
    .mutation(({ input }) => activateUser(input)),

  // Categories routes
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  
  updateCategory: publicProcedure
    .input(z.object({ id: z.number(), data: createCategoryInputSchema.partial() }))
    .mutation(({ input }) => updateCategory(input.id, input.data)),
  
  deleteCategory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCategory(input)),

  // Ads routes
  getAds: publicProcedure
    .input(getAdsInputSchema)
    .query(({ input }) => getAds(input)),
  
  getAdById: publicProcedure
    .input(z.number())
    .query(({ input }) => getAdById(input)),
  
  getUserAds: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserAds(input)),
  
  createAd: publicProcedure
    .input(z.object({ data: createAdInputSchema, userId: z.number() }))
    .mutation(({ input }) => createAd(input.data, input.userId)),
  
  updateAd: publicProcedure
    .input(z.object({ data: updateAdInputSchema, userId: z.number() }))
    .mutation(({ input }) => updateAd(input.data, input.userId)),
  
  deleteAd: publicProcedure
    .input(z.object({ id: z.number(), userId: z.number() }))
    .mutation(({ input }) => deleteAd(input.id, input.userId)),
  
  boostAd: publicProcedure
    .input(z.object({ data: boostAdInputSchema, userId: z.number() }))
    .mutation(({ input }) => boostAd(input.data, input.userId)),
  
  moderateAd: publicProcedure
    .input(moderateAdInputSchema)
    .mutation(({ input }) => moderateAd(input)),
  
  incrementContactCount: publicProcedure
    .input(z.number())
    .mutation(({ input }) => incrementContactCount(input)),

  // Membership routes
  getMembershipPackages: publicProcedure
    .query(() => getMembershipPackages()),
  
  createMembershipPackage: publicProcedure
    .input(createMembershipPackageInputSchema)
    .mutation(({ input }) => createMembershipPackage(input)),
  
  updateMembershipPackage: publicProcedure
    .input(z.object({ id: z.number(), data: createMembershipPackageInputSchema.partial() }))
    .mutation(({ input }) => updateMembershipPackage(input.id, input.data)),
  
  deactivateMembershipPackage: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deactivateMembershipPackage(input)),
  
  assignMembershipToUser: publicProcedure
    .input(z.object({ userId: z.number(), membershipId: z.number() }))
    .mutation(({ input }) => assignMembershipToUser(input.userId, input.membershipId)),

  // Payment routes
  createPayment: publicProcedure
    .input(z.object({ data: createPaymentInputSchema, userId: z.number() }))
    .mutation(({ input }) => createPayment(input.data, input.userId)),
  
  handleMidtransCallback: publicProcedure
    .input(z.object({ transactionId: z.string(), status: z.string(), response: z.any() }))
    .mutation(({ input }) => handleMidtransCallback(input.transactionId, input.status, input.response)),
  
  getUserPayments: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserPayments(input)),
  
  getAllPayments: publicProcedure
    .query(() => getAllPayments()),
  
  getPaymentById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPaymentById(input)),
  
  processSuccessfulPayment: publicProcedure
    .input(z.number())
    .mutation(({ input }) => processSuccessfulPayment(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Fish Trading Classified Ads TRPC server listening at port: ${port}`);
}

start();
