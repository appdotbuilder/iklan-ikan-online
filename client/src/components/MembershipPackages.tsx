
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { MembershipPackage, User, CreatePaymentInput } from '../../../server/src/schema';

interface MembershipPackagesProps {
  currentUser: User;
}

export function MembershipPackages({ currentUser }: MembershipPackagesProps) {
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPackages = useCallback(async () => {
    try {
      const result = await trpc.getMembershipPackages.query();
      setPackages(result);
    } catch (error) {
      console.error('Failed to load membership packages:', error);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handlePurchase = async (packageItem: MembershipPackage) => {
    setIsLoading(true);
    try {
      const paymentData: CreatePaymentInput = {
        membership_id: packageItem.id,
        ad_id: null,
        type: 'membership',
        amount: packageItem.price
      };
      
      const payment = await trpc.createPayment.mutate({ 
        data: paymentData, 
        userId: currentUser.id 
      });
      
      // In a real app, redirect to Midtrans payment page
      console.log('Payment created:', payment);
      alert('Payment created! In a real app, you would be redirected to Midtrans payment page.');
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPackageColor = (index: number) => {
    const colors = [
      'from-blue-600 to-cyan-600',
      'from-purple-600 to-pink-600',
      'from-orange-600 to-red-600',
      'from-green-600 to-emerald-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-purple-400 mb-4">
          💎 Upgrade Your Membership
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Choose a membership package to unlock premium features, get more ad slots, 
          and boost credits to promote your fish listings.
        </p>
      </div>

      {/* Current Status */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-md">
              <p className="text-sm text-gray-300">Membership</p>
              <p className="text-lg font-bold text-white">
                {currentUser.membership_id ? `Package #${currentUser.membership_id}` : 'Free Plan'}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-md">
              <p className="text-sm text-gray-300">Boost Credits</p>
              <p className="text-lg font-bold text-yellow-400">
                {currentUser.boost_credits} credits
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-md">
              <p className="text-sm text-gray-300">Account Status</p>
              <Badge className={currentUser.is_active ? 'bg-green-600' : 'bg-red-600'}>
                {currentUser.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Membership Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">💎</div>
            <p className="text-gray-400 text-lg">No membership packages available.</p>
          </div>
        ) : (
          packages.map((pkg: MembershipPackage, index: number) => (
            <Card 
              key={pkg.id} 
              className={`bg-gray-900 border-gray-700 relative overflow-hidden hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getPackageColor(index)}`} />
              
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-white flex items-center justify-between">
                  {pkg.name}
                  {index === 1 && (
                    <Badge className="bg-yellow-600 text-xs">POPULAR</Badge>
                  )}
                </CardTitle>
                <div className="text-3xl font-bold text-white">
                  Rp {pkg.price.toLocaleString('id-ID')}
                  <span className="text-sm text-gray-400 font-normal">
                    /{pkg.duration_days} days
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {pkg.description && (
                  <p className="text-gray-300 text-sm">{pkg.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Max Ads</span>
                    <span className="text-cyan-400 font-medium">{pkg.max_ads}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Boost Credits</span>
                    <span className="text-yellow-400 font-medium">{pkg.boost_credits}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Duration</span>
                    <span className="text-white font-medium">{pkg.duration_days} days</span>
                  </div>
                </div>

                {pkg.features.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 font-medium">Features:</p>
                    <ul className="space-y-1">
                      {pkg.features.map((feature: string, featureIndex: number) => (
                        <li key={featureIndex} className="text-xs text-gray-400 flex items-center">
                          <span className="text-green-400 mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isLoading || !pkg.is_active}
                  className={`w-full bg-gradient-to-r ${getPackageColor(index)} hover:opacity-90 disabled:opacity-50`}
                >
                  {isLoading ? 'Processing...' : 'Choose This Plan'}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Instant activation after payment confirmation
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-3">💳 Payment Methods</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Bank Transfer (All Indonesian Banks)</li>
                <li>• E-Wallet (GoPay, OVO, DANA, LinkAja)</li>
                <li>• Credit/Debit Cards (Visa, Mastercard)</li>
                <li>• Convenience Stores (Alfamart, Indomaret)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3">⭐ Boost Credits</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Make your ads appear first</li>
                <li>• Get highlighted with special badge</li>
                <li>• Increase visibility by up to 300%</li>
                <li>• 1 credit = 1 day of boosting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
