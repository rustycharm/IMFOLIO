import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HeroImageManager() {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<'global' | 'custom'>('global');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('');
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);

  // Fetch available global hero images
  const { data: heroImages = [], isLoading: heroLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/hero-images'],
  });

  // Fetch user's current hero selection
  const { data: currentHero, isLoading: currentLoading } = useQuery<any>({
    queryKey: ['/api/user/hero-selection'],
  });

  // Fetch user's photos for custom hero selection
  const { data: userPhotos = [], isLoading: photosLoading } = useQuery<any[]>({
    queryKey: ['/api/user/photos'],
  });



  // Set global hero image mutation
  const setGlobalHeroMutation = useMutation({
    mutationFn: async (heroImageId: string) => {
      console.log('🔥 FRONTEND: Making API request to set global hero image...');
      console.log('🔥 FRONTEND: Hero ID being sent:', heroImageId);

      const result = await apiRequest('/api/user/hero-image/set-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ heroImageId }),
      });

      console.log('🔥 FRONTEND: API response received:', result);

      if (!result.success) {
        throw new Error(result.message || 'Hero image update failed');
      }

      return result;
    },
    onSuccess: (data) => {
      console.log('🔥 FRONTEND: Mutation success with data:', data);
      toast({
        title: "Hero Image Updated",
        description: `Your hero image "${data.heroImageName || 'Unknown'}" has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/hero-selection'] });
    },
    onError: (error: any) => {
      console.error('🔥 FRONTEND: Mutation error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update hero image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Set custom hero image mutation
  const setCustomHeroMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const result = await apiRequest('/api/user/hero-image/set-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId }),
      });
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Custom Hero Image Set",
        description: "Your photo has been set as your hero image.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/hero-selection'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to set custom hero image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveHeroSelection = () => {
    console.log('🔥 FRONTEND: Save button clicked!');
    console.log('🔥 FRONTEND: selectedOption:', selectedOption);
    console.log('🔥 FRONTEND: selectedHeroId:', selectedHeroId);
    console.log('🔥 FRONTEND: selectedPhotoId:', selectedPhotoId);

    if (selectedOption === 'global' && selectedHeroId) {
      console.log('🔥 FRONTEND: Triggering global hero mutation with ID:', selectedHeroId);
      setGlobalHeroMutation.mutate(selectedHeroId);
    } else if (selectedOption === 'custom' && selectedPhotoId) {
      console.log('🔥 FRONTEND: Triggering custom hero mutation with photo ID:', selectedPhotoId);
      setCustomHeroMutation.mutate(selectedPhotoId);
    } else {
      console.log('🔥 FRONTEND: Save conditions not met!', {
        selectedOption,
        selectedHeroId,
        selectedPhotoId,
        globalCondition: selectedOption === 'global' && selectedHeroId,
        customCondition: selectedOption === 'custom' && selectedPhotoId
      });
    }
  };

  const isLoading = heroLoading || currentLoading || photosLoading;
  const isPending = setGlobalHeroMutation.isPending || setCustomHeroMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleCustomImageUpload = async (file: File) => {
    try {
      setUploadLoading(true);

      // Validate file size and type
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Only JPEG, PNG, and WebP images are allowed');
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', 'Custom Hero Image');

      const response = await fetch('/api/hero-images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Validate that the returned URL belongs to current user
      if (!result.url.includes(`/${user?.id}/`)) {
        throw new Error('Security validation failed - file path mismatch');
      }

      // Set as user's custom hero image
      await setUserHeroImage({
        heroImageId: result.id,
        customImageUrl: result.url,
        customImageTitle: result.title
      });

      queryClient.invalidateQueries({ queryKey: ['hero-images'] });

    } catch (error) {
      console.error('Custom upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload custom image",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };
  

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Hero Image Settings</h3>
        <p className="text-gray-500">Choose how your hero banner appears on your portfolio</p>
      </div>

      {/* Current Selection Display */}
      {currentHero && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Hero Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <img 
                src={currentHero.url} 
                alt={currentHero.name}
                className="w-24 h-16 object-cover rounded-md"
              />
              <div>
                <p className="font-medium">{currentHero.name}</p>
                <p className="text-sm text-gray-500">{currentHero.description}</p>
                {currentHero.id?.startsWith('custom-') && (
                  <Badge variant="secondary" className="mt-1">Custom Photo</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Options */}
      <div className="grid gap-4">
        {/* Global Hero Images Option */}
        <Card className={selectedOption === 'global' ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="global-hero"
                name="hero-option"
                checked={selectedOption === 'global'}
                onChange={() => setSelectedOption('global')}
                className="w-4 h-4"
              />
              <div>
                <CardTitle className="text-lg">Choose Global Hero Image</CardTitle>
                <CardDescription>Select from curated hero images</CardDescription>
              </div>
            </div>
          </CardHeader>
          {selectedOption === 'global' && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {heroImages.map((hero: any) => (
                  <div
                    key={hero.id}
                    className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedHeroId === hero.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedHeroId(hero.id)}
                  >
                    <img
                      src={hero.url}
                      alt={hero.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-sm font-medium">{hero.name}</p>
                      <p className="text-xs text-gray-500 truncate">{hero.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Custom Photo Option */}
        <Card className={selectedOption === 'custom' ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="custom-hero"
                name="hero-option"
                checked={selectedOption === 'custom'}
                onChange={() => setSelectedOption('custom')}
                className="w-4 h-4"
              />
              <div>
                <CardTitle className="text-lg">Use Your Own Photo</CardTitle>
                <CardDescription>Select from your uploaded photos</CardDescription>
              </div>
            </div>
          </CardHeader>
          {selectedOption === 'custom' && (
            <CardContent>
              {userPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {userPhotos.map((photo: any) => (
                    <div
                      key={photo.id}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotoId === photo.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPhotoId(photo.id)}
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2">
                        <p className="text-sm font-medium">{photo.title}</p>
                        <p className="text-xs text-gray-500">{photo.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No photos uploaded yet.</p>
                  <Button variant="outline" className="mt-2" onClick={() => window.location.href = '/my-photos'}>
                    Upload Photos
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveHeroSelection}
          disabled={isPending || (selectedOption === 'global' && !selectedHeroId) || (selectedOption === 'custom' && !selectedPhotoId)}
        >
          {isPending ? "Updating..." : "Update Hero Image"}
        </Button>
      </div>
    </div>
  );
}