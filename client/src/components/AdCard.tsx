
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { trpc } from '@/utils/trpc';
import type { Ad, User, BoostAdInput } from '../../../server/src/schema';

interface AdCardProps {
  ad: Ad;
  onContactClick: (adId: number) => void;
  currentUser: User | null;
  onAdUpdated?: (ad: Ad) => void;
  onAdDeleted?: (adId: number) => void;
  isOwner?: boolean;
}

export function AdCard({ 
  ad, 
  onContactClick, 
  currentUser, 
  onAdUpdated, 
  onAdDeleted, 
  isOwner = false 
}: AdCardProps) {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isBoostOpen, setIsBoostOpen] = useState(false);
  const [boostDays, setBoostDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);

  const handleContactClick = () => {
    onContactClick(ad.id);
    setIsContactOpen(true);
  };

  const handleBoostAd = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const boostData: BoostAdInput = {
        ad_id: ad.id,
        duration_days: boostDays
      };
      const boostedAd = await trpc.boostAd.mutate({ data: boostData, userId: currentUser.id });
      onAdUpdated?.(boostedAd);
      setIsBoostOpen(false);
    } catch (error) {
      console.error('Failed to boost ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAd = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await trpc.deleteAd.mutate({ id: ad.id, userId: currentUser.id });
      onAdDeleted?.(ad.id);
    } catch (error) {
      console.error('Failed to delete ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-600';
      case 'draft': return 'bg-yellow-600';
      case 'expired': return 'bg-gray-600';
      case 'rejected': return 'bg-red-600';
      case 'deleted': return 'bg-red-800';
      default: return 'bg-gray-600';
    }
  };

  const isExpiredBoost = ad.boost_expires_at ? new Date(ad.boost_expires_at) < new Date() : false;
  const isActiveBoosted = ad.is_boosted && !isExpiredBoost;

  return (
    <Card className={`bg-gray-900 border-gray-700 transition-all duration-200 hover:scale-[1.02] ${
      isActiveBoosted ? 'ring-2 ring-yellow-500 shadow-lg shadow-yellow-500/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-white line-clamp-2">
            {isActiveBoosted && <span className="text-yellow-400 mr-2">⭐</span>}
            {ad.title}
          </CardTitle>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={`text-xs ${getStatusColor(ad.status)}`}>
              {ad.status}
            </Badge>
            {isActiveBoosted && (
              <Badge className="text-xs bg-yellow-600">
                Boosted
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Image placeholder */}
        <div className="w-full h-48 bg-gray-800 rounded-md flex items-center justify-center">
          {ad.images.length > 0 ? (
            <img 
              src={ad.images[0]} 
              alt={ad.title}
              className="w-full h-full object-cover rounded-md"
            />
          ) : (
            <div className="text-6xl">🐟</div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-bold text-cyan-400">
            Rp {ad.price.toLocaleString('id-ID')}
          </p>
          
          <p className="text-gray-300 text-sm line-clamp-3">
            {ad.description}
          </p>
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>📍 {ad.location}</p>
            <p>👁️ {ad.view_count} views • 📞 {ad.contact_count} contacts</p>
            <p>📅 {ad.created_at.toLocaleDateString()}</p>
            {ad.boost_expires_at && isActiveBoosted && (
              <p className="text-yellow-400">
                ⭐ Boosted until {ad.boost_expires_at.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          {!isOwner && ad.status === 'active' && (
            <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleContactClick}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  📞 Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">Contact Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-md">
                    <p className="text-sm text-gray-300 mb-2">Contact this seller:</p>
                    <p className="text-white font-medium">{ad.contact_info}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    This contact view has been recorded for statistics.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {isOwner && (
            <>
              {!isActiveBoosted && currentUser && currentUser.boost_credits > 0 && ad.status === 'active' && (
                <Dialog open={isBoostOpen} onOpenChange={setIsBoostOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      ⭐ Boost
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-yellow-400">Boost Your Ad</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-300">
                        Boosted ads appear first in search results and get more visibility.
                      
                      </p>
                      <div>
                        <label className="text-sm text-gray-300 mb-2 block">Boost Duration (Days)</label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={boostDays}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setBoostDays(parseInt(e.target.value) || 1)
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        Cost: {boostDays} boost credits (You have {currentUser?.boost_credits} credits)
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleBoostAd}
                          disabled={isLoading || boostDays > (currentUser?.boost_credits || 0)}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                        >
                          {isLoading ? 'Boosting...' : `Boost for ${boostDays} days`}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    🗑️ Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-gray-900 border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-400">Delete Ad</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-300">
                      Are you sure you want to delete this ad? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAd}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isLoading ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {ad.rejection_reason && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-md">
            <p className="text-red-400 text-sm font-medium">Rejection Reason:</p>
            <p className="text-red-300 text-sm">{ad.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
