
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Category, User, CreateAdInput, Ad } from '../../../server/src/schema';

interface AdFormProps {
  categories: Category[];
  currentUser: User;
  onAdCreated: (ad: Ad) => void;
  onSuccess: () => void;
}

export function AdForm({ categories, currentUser, onAdCreated, onSuccess }: AdFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAdInput>({
    category_id: 0,
    title: '',
    description: '',
    price: 0,
    location: '',
    contact_info: '',
    images: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newAd = await trpc.createAd.mutate({ 
        data: formData, 
        userId: currentUser.id 
      });
      onAdCreated(newAd);
      onSuccess();
      
      // Reset form
      setFormData({
        category_id: 0,
        title: '',
        description: '',
        price: 0,
        location: '',
        contact_info: '',
        images: []
      });
    } catch (error) {
      console.error('Failed to create ad:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center space-x-2">
          <span>🐟</span>
          <span>Create Your Fish Ad</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Category *</label>
                <Select 
                  value={formData.category_id.toString()} 
                  onValueChange={(value) => 
                    setFormData((prev: CreateAdInput) => ({ 
                      ...prev, 
                      category_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {categories.map((category: Category) => (
                      <SelectItem 
                        key={category.id} 
                        value={category.id.toString()} 
                        className="text-white"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateAdInput) => ({ ...prev, title: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., Fresh Salmon - Premium Quality"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Price (IDR) *</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateAdInput) => ({ 
                      ...prev, 
                      price: parseFloat(e.target.value) || 0 
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Location *</label>
                <Input
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateAdInput) => ({ ...prev, location: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="e.g., Jakarta Selatan, DKI Jakarta"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Description *</label>
                <Textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateAdInput) => ({ ...prev, description: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-white min-h-[120px]"
                  placeholder="Describe your fish: size, quality, freshness, special features..."
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Contact Information *</label>
                <Textarea
                  value={formData.contact_info}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateAdInput) => ({ ...prev, contact_info: e.target.value }))
                  }
                  className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                  placeholder="Phone: +62xxx&#10;WhatsApp: +62xxx&#10;Address: ..."
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block">Image URLs (optional)</label>
                <Textarea
                  value={formData.images.join('\n')}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateAdInput) => ({ 
                      ...prev, 
                      images: e.target.value.split('\n').filter(url => url.trim() !== '') 
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                  placeholder="Enter image URLs, one per line (max 10 images)"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Add up to 10 image URLs. Each URL should be on a separate line.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <div className="bg-gray-800 p-4 rounded-md mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">📋 Before You Submit:</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Make sure all information is accurate and complete</li>
                <li>• Your ad will be reviewed by our moderators</li>
                <li>• Once approved, it will appear in search results</li>
                <li>• You can boost your ad later for better visibility</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <Button 
                type="submit" 
                disabled={isLoading || !formData.title || !formData.description || !formData.location || !formData.contact_info || formData.category_id === 0}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {isLoading ? 'Creating Ad...' : '🚀 Create Ad'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
