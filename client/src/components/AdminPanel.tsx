
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { User, Ad, Category, MembershipPackage, Payment, CreateCategoryInput, CreateMembershipPackageInput, ModerateAdInput } from '../../../server/src/schema';

export function AdminPanel() {
  // State for different sections
  const [users, setUsers] = useState<User[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    name: '',
    description: null,
    icon_url: null
  });
  const [packageForm, setPackageForm] = useState<CreateMembershipPackageInput>({
    name: '',
    description: null,
    price: 0,
    duration_days: 30,
    max_ads: 5,
    boost_credits: 0,
    features: []
  });
  
  // Features text for form input
  const [featuresText, setFeaturesText] = useState('');

  // Load data functions
  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query({});
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadAds = useCallback(async () => {
    try {
      const result = await trpc.getAds.query({});
      setAds(result);
    } catch (error) {
      console.error('Failed to load ads:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadPackages = useCallback(async () => {
    try {
      const result = await trpc.getMembershipPackages.query();
      setPackages(result);
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      const result = await trpc.getAllPayments.query();
      setPayments(result);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadAds();
    loadCategories();
    loadPackages();
    loadPayments();
  }, [loadUsers, loadAds, loadCategories, loadPackages, loadPayments]);

  // Handler functions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newCategory = await trpc.createCategory.mutate(categoryForm);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setCategoryForm({ name: '', description: null, icon_url: null });
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const features = featuresText.trim() 
        ? featuresText.split('\n').filter((f: string) => f.trim() !== '')
        : [];
      
      const newPackage = await trpc.createMembershipPackage.mutate({
        ...packageForm,
        features
      });
      setPackages((prev: MembershipPackage[]) => [...prev, newPackage]);
      setPackageForm({
        name: '',
        description: null,
        price: 0,
        duration_days: 30,
        max_ads: 5,
        boost_credits: 0,
        features: []
      });
      setFeaturesText('');
    } catch (error) {
      console.error('Failed to create package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModerateAd = async (adId: number, status: 'active' | 'rejected', reason?: string) => {
    setIsLoading(true);
    try {
      const moderationData: ModerateAdInput = {
        ad_id: adId,
        status,
        rejection_reason: reason || null
      };
      const moderatedAd = await trpc.moderateAd.mutate(moderationData);
      setAds((prev: Ad[]) => prev.map((ad: Ad) => ad.id === adId ? moderatedAd : ad));
    } catch (error) {
      console.error('Failed to moderate ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, activate: boolean) => {
    setIsLoading(true);
    try {
      if (activate) {
        await trpc.activateUser.mutate(userId);
      } else {
        await trpc.deactivateUser.mutate(userId);
      }
      setUsers((prev: User[]) => prev.map((user: User) => 
        user.id === userId ? { ...user, is_active: activate } : user
      ));
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-red-400 mb-4">
          ⚙️ Administrator Panel
        </h2>
        <p className="text-gray-300">
          Manage users, categories, membership packages, and moderate ads
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-900 border border-gray-700">
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
            👥 Users
          </TabsTrigger>
          <TabsTrigger value="ads" className="data-[state=active]:bg-green-600">
            📢 Ads
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-purple-600">
            📂 Categories
          </TabsTrigger>
          <TabsTrigger value="packages" className="data-[state=active]:bg-orange-600">
            💎 Packages
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-cyan-600">
            💳 Payments
          </TabsTrigger>
        </TabsList>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-blue-400">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user: User) => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-md">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{user.full_name}</h3>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={user.is_active ? 'bg-green-600' : 'bg-red-600'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.is_admin && (
                          <Badge className="bg-purple-600">Admin</Badge>
                        )}
                        <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                          {user.boost_credits} credits
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleUserStatus(user.id, !user.is_active)}
                        disabled={isLoading}
                        className={user.is_active 
                          ? 'border-red-500 text-red-400 hover:bg-red-500/10'
                          : 'border-green-500 text-green-400 hover:bg-green-500/10'
                        }
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ads Moderation */}
        <TabsContent value="ads" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-green-400">Ad Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ads.filter((ad: Ad) => ad.status === 'draft').map((ad: Ad) => (
                  <div key={ad.id} className="p-4 bg-gray-800 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{ad.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{ad.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                          <span>💰 Rp {ad.price.toLocaleString('id-ID')}</span>
                          <span>📍 {ad.location}</span>
                          <span>📅 {ad.created_at.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge className="bg-yellow-600">{ad.status}</Badge>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleModerateAd(ad.id, 'active')}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Approve
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                          >
                            ❌ Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-red-400">Reject Ad</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Textarea
                              placeholder="Reason for rejection..."
                              className="bg-gray-800 border-gray-600 text-white"
                              id={`rejection-reason-${ad.id}`}
                            />
                            <Button
                              onClick={() => {
                                const textarea = document.getElementById(`rejection-reason-${ad.id}`) as HTMLTextAreaElement;
                                handleModerateAd(ad.id, 'rejected', textarea.value);
                              }}
                              disabled={isLoading}
                              className="w-full bg-red-600 hover:bg-red-700"
                            >
                              Reject Ad
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                {ads.filter((ad: Ad) => ad.status === 'draft').length === 0 && (
                  <p className="text-gray-400 text-center py-8">No ads pending moderation.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Management */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-purple-400">Category Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Category Form */}
              <form onSubmit={handleCreateCategory} className="space-y-4 p-4 bg-gray-800 rounded-md">
                <h3 className="text-lg font-medium text-white">Create New Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Category name"
                    value={categoryForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryForm((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={categoryForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryForm((prev: CreateCategoryInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Input
                    placeholder="Icon URL (optional)"
                    value={categoryForm.icon_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryForm((prev: CreateCategoryInput) => ({ 
                        ...prev, 
                        icon_url: e.target.value || null 
                      }))
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? 'Creating...' : 'Create Category'}
                </Button>
              </form>

              {/* Categories List */}
              <div className="space-y-2">
                {categories.map((category: Category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-md">
                    <div>
                      <h4 className="text-white font-medium">{category.name}</h4>
                      {category.description && (
                        <p className="text-gray-400 text-sm">{category.description}</p>
                      )}
                    </div>
                    <Badge className={category.is_active ? 'bg-green-600' : 'bg-red-600'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Membership Packages */}
        <TabsContent value="packages" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-orange-400">Membership Package Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Package Form */}
              <form onSubmit={handleCreatePackage} className="space-y-4 p-4 bg-gray-800 rounded-md">
                <h3 className="text-lg font-medium text-white">Create New Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Input
                      placeholder="Package name"
                      value={packageForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ ...prev, name: e.target.value }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={packageForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ 
                          ...prev, 
                          description: e.target.value || null 
                        }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <Input
                      type="number"
                      placeholder="Price (IDR)"
                      value={packageForm.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ 
                          ...prev, 
                          price: parseFloat(e.target.value) || 0 
                        }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Duration (days)"
                      value={packageForm.duration_days}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ 
                          ...prev, 
                          duration_days: parseInt(e.target.value) || 30 
                        }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Max ads allowed"
                      value={packageForm.max_ads}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ 
                          ...prev, 
                          max_ads: parseInt(e.target.value) || 5 
                        }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Boost credits included"
                      value={packageForm.boost_credits}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPackageForm((prev: CreateMembershipPackageInput) => ({ 
                          ...prev, 
                          boost_credits: parseInt(e.target.value) || 0 
                        }))
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>
                <Textarea
                  placeholder="Features (one per line)"
                  value={featuresText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFeaturesText(e.target.value)
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? 'Creating...' : 'Create Package'}
                </Button>
              </form>

              {/* Packages List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg: MembershipPackage) => (
                  <div key={pkg.id} className="p-4 bg-gray-800 rounded-md">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{pkg.name}</h4>
                      <Badge className={pkg.is_active ? 'bg-green-600' : 'bg-red-600'}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-orange-400 mb-2">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </p>
                    <div className="text-sm text-gray-400 space-y-1">
                      <p>Duration: {pkg.duration_days} days</p>
                      <p>Max Ads: {pkg.max_ads}</p>
                      <p>Boost Credits: {pkg.boost_credits}</p>
                      {pkg.features.length > 0 && (
                        <div>
                          <p>Features:</p>
                          <ul className="list-disc list-inside">
                            {pkg.features.map((feature: string, index: number) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-cyan-400">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment: Payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-white font-medium">
                          Payment #{payment.id}
                        </h3>
                        <Badge className={
                          payment.status === 'paid' ? 'bg-green-600' :
                          payment.status === 'pending' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        <p>Type: {payment.type} • Amount: Rp {payment.amount.toLocaleString('id-ID')}</p>
                        <p>Date: {payment.created_at.toLocaleDateString()}</p>
                        {payment.midtrans_transaction_id && (
                          <p>Midtrans ID: {payment.midtrans_transaction_id}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No payments found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
