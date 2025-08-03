
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, UpdateUserInput } from '../../../server/src/schema';

interface UserProfileProps {
  currentUser: User;
  onUserUpdated: (user: User) => void;
}

export function UserProfile({ currentUser, onUserUpdated }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateUserInput>({
    id: currentUser.id,
    full_name: currentUser.full_name,
    phone: currentUser.phone,
    avatar_url: currentUser.avatar_url
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const updatedUser = await trpc.updateUser.mutate(formData);
      onUserUpdated(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      id: currentUser.id,
      full_name: currentUser.full_name,
      phone: currentUser.phone,
      avatar_url: currentUser.avatar_url
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-orange-400 mb-4">
          👤 My Profile
        </h2>
      </div>

      {/* Profile Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-400">Profile Information</CardTitle>
            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
              >
                ✏️ Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Full Name</label>
                <Input
                  value={formData.full_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Phone</label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ 
                      ...prev, 
                      phone: e.target.value || null 
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Avatar URL</label>
                <Input
                  value={formData.avatar_url || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: UpdateUserInput) => ({ 
                      ...prev, 
                      avatar_url: e.target.value || null 
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Optional"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300">Full Name</p>
                  <p className="text-lg font-medium text-white">{currentUser.full_name}</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300">Email</p>
                  <p className="text-lg font-medium text-white">{currentUser.email}</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300">Phone</p>
                  <p className="text-lg font-medium text-white">
                    {currentUser.phone || 'Not provided'}
                  </p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300">Member Since</p>
                  <p className="text-lg font-medium text-white">
                    {currentUser.created_at.toLocaleDateString()}
                  </p>
                </div>
              </div>

              {currentUser.avatar_url && (
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300 mb-2">Profile Picture</p>
                  <img 
                    src={currentUser.avatar_url} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400">Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-md text-center">
              <p className="text-sm text-gray-300">Membership</p>
              <Badge className="mt-2 bg-purple-600">
                {currentUser.membership_id ? `Package #${currentUser.membership_id}` : 'Free Plan'}
              </Badge>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-md text-center">
              <p className="text-sm text-gray-300">Boost Credits</p>
              <div className="text-2xl font-bold text-yellow-400 mt-1">
                {currentUser.boost_credits}
              </div>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-md text-center">
              <p className="text-sm text-gray-300">Account Status</p>
              <Badge className={`mt-2 ${currentUser.is_active ? 'bg-green-600' : 'bg-red-600'}`}>
                {currentUser.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Badge */}
      {currentUser.is_admin && (
        <Card className="bg-gray-900 border-red-500">
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge className="bg-red-600 text-lg px-4 py-2">
                🛡️ Administrator
              </Badge>
              <p className="text-gray-300 text-sm mt-2">
                You have administrator privileges
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
