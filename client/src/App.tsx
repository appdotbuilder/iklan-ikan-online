
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdCard } from '@/components/AdCard';
import { AdForm } from '@/components/AdForm';
import { MembershipPackages } from '@/components/MembershipPackages';
import { UserProfile } from '@/components/UserProfile';
import { AdminPanel } from '@/components/AdminPanel';
import type { Ad, Category, User, LoginInput, CreateUserInput } from '../../server/src/schema';

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // App state
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userAds, setUserAds] = useState<Ad[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  // Form states
  const [loginForm, setLoginForm] = useState<LoginInput>({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<CreateUserInput>({ 
    email: '', 
    password: '', 
    full_name: '', 
    phone: null 
  });

  // Load user data on mount
  const loadCurrentUser = useCallback(async () => {
    if (!authToken) return;
    try {
      const user = await trpc.getCurrentUser.query(authToken);
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('auth_token');
      setAuthToken(null);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      loadCurrentUser();
    }
  }, [authToken, loadCurrentUser]);

  // Load initial data
  const loadAds = useCallback(async () => {
    try {
      const filters = {
        category_id: selectedCategory !== 'all' ? parseInt(selectedCategory) : undefined,
        search: searchQuery || undefined,
        location: location || undefined,
        min_price: priceRange.min ? parseFloat(priceRange.min) : undefined,
        max_price: priceRange.max ? parseFloat(priceRange.max) : undefined,
        limit: 50
      };
      const result = await trpc.getAds.query(filters);
      setAds(result);
    } catch (error) {
      console.error('Failed to load ads:', error);
    }
  }, [selectedCategory, searchQuery, location, priceRange]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadUserAds = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await trpc.getUserAds.query(currentUser.id);
      setUserAds(result);
    } catch (error) {
      console.error('Failed to load user ads:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (currentUser && activeTab === 'my-ads') {
      loadUserAds();
    }
  }, [loadUserAds, currentUser, activeTab]);

  // Auth handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.login.mutate(loginForm);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      localStorage.setItem('auth_token', response.token);
      setIsLoginOpen(false);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.register.mutate(registerForm);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      localStorage.setItem('auth_token', response.token);
      setIsRegisterOpen(false);
      setRegisterForm({ email: '', password: '', full_name: '', phone: null });
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    setActiveTab('browse');
  };

  const handleAdCreated = (newAd: Ad) => {
    setAds((prev: Ad[]) => [newAd, ...prev]);
    setUserAds((prev: Ad[]) => [newAd, ...prev]);
  };

  const handleAdUpdated = (updatedAd: Ad) => {
    setAds((prev: Ad[]) => prev.map((ad: Ad) => ad.id === updatedAd.id ? updatedAd : ad));
    setUserAds((prev: Ad[]) => prev.map((ad: Ad) => ad.id === updatedAd.id ? updatedAd : ad));
  };

  const handleAdDeleted = (adId: number) => {
    setAds((prev: Ad[]) => prev.filter((ad: Ad) => ad.id !== adId));
    setUserAds((prev: Ad[]) => prev.filter((ad: Ad) => ad.id !== adId));
  };

  const handleContactClick = async (adId: number) => {
    try {
      await trpc.incrementContactCount.mutate(adId);
    } catch (error) {
      console.error('Failed to increment contact count:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🐟</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                FishMarket
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-300">Welcome,</span>
                    <span className="text-cyan-400 font-medium">{currentUser.full_name}</span>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                      {currentUser.boost_credits} credits
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
                        Login
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-cyan-400">Login to FishMarket</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                          type="email"
                          placeholder="Email"
                          value={loginForm.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setLoginForm((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                        <Input
                          type="password"
                          placeholder="Password"
                          value={loginForm.password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setLoginForm((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full bg-cyan-600 hover:bg-cyan-700"
                        >
                          {isLoading ? 'Logging in...' : 'Login'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                        Register
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-cyan-400">Join FishMarket</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleRegister} className="space-y-4">
                        <Input
                          placeholder="Full Name"
                          value={registerForm.full_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRegisterForm((prev: CreateUserInput) => ({ ...prev, full_name: e.target.value }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={registerForm.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRegisterForm((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                        />
                        <Input
                          placeholder="Phone (optional)"
                          value={registerForm.phone || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRegisterForm((prev: CreateUserInput) => ({ 
                              ...prev, 
                              phone: e.target.value || null 
                            }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                        />
                        <Input
                          type="password"
                          placeholder="Password (min 8 chars)"
                          value={registerForm.password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setRegisterForm((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                          }
                          className="bg-gray-800 border-gray-600 text-white"
                          required
                          minLength={8}
                        />
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                        >
                          {isLoading ? 'Creating account...' : 'Register'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-900 border border-gray-700">
            <TabsTrigger value="browse" className="data-[state=active]:bg-cyan-600">
              🔍 Browse Ads
            </TabsTrigger>
            {currentUser && (
              <>
                <TabsTrigger value="my-ads" className="data-[state=active]:bg-blue-600">
                  📋 My Ads
                </TabsTrigger>
                <TabsTrigger value="create-ad" className="data-[state=active]:bg-green-600">
                  ➕ Create Ad
                </TabsTrigger>
                <TabsTrigger value="membership" className="data-[state=active]:bg-purple-600">
                  💎 Membership
                </TabsTrigger>
                <TabsTrigger value="profile" className="data-[state=active]:bg-orange-600">
                  👤 Profile
                </TabsTrigger>
              </>
            )}
            {currentUser?.is_admin && (
              <TabsTrigger value="admin" className="data-[state=active]:bg-red-600">
                ⚙️ Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Browse Ads Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Find Your Perfect Fish</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="all" className="text-white">All Categories</SelectItem>
                        {categories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()} className="text-white">
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Search</label>
                    <Input
                      placeholder="Search ads..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Location</label>
                    <Input
                      placeholder="Location..."
                      value={location}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Price Range</label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPriceRange((prev) => ({ ...prev, min: e.target.value }))
                        }
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPriceRange((prev) => ({ ...prev, max: e.target.value }))
                        }
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ads.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">🐟</div>
                  <p className="text-gray-400 text-lg">No fish ads found. Be the first to post!</p>
                </div>
              ) : (
                ads.map((ad: Ad) => (
                  <AdCard 
                    key={ad.id} 
                    ad={ad} 
                    onContactClick={handleContactClick}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* My Ads Tab */}
          {currentUser && (
            <TabsContent value="my-ads" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-cyan-400">My Fish Ads</h2>
                <Button 
                  onClick={() => setActiveTab('create-ad')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  ➕ Create New Ad
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userAds.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-400 text-lg">You haven't created any ads yet.</p>
                    <Button 
                      onClick={() => setActiveTab('create-ad')}
                      className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Create Your First Ad
                    </Button>
                  </div>
                ) : (
                  userAds.map((ad: Ad) => (
                    <AdCard 
                      key={ad.id} 
                      ad={ad} 
                      onContactClick={handleContactClick}
                      currentUser={currentUser}
                      onAdUpdated={handleAdUpdated}
                      onAdDeleted={handleAdDeleted}
                      isOwner={true}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          )}

          {/* Create Ad Tab */}
          {currentUser && (
            <TabsContent value="create-ad" className="space-y-6">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-green-400 mb-6 text-center">
                  🐟 Create New Fish Ad
                </h2>
                <AdForm 
                  categories={categories}
                  currentUser={currentUser}
                  onAdCreated={handleAdCreated}
                  onSuccess={() => setActiveTab('my-ads')}
                />
              </div>
            </TabsContent>
          )}

          {/* Membership Tab */}
          {currentUser && (
            <TabsContent value="membership">
              <MembershipPackages currentUser={currentUser} />
            </TabsContent>
          )}

          {/* Profile Tab */}
          {currentUser && (
            <TabsContent value="profile">
              <UserProfile currentUser={currentUser} onUserUpdated={setCurrentUser} />
            </TabsContent>
          )}

          {/* Admin Panel */}
          {currentUser?.is_admin && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

export default App;
