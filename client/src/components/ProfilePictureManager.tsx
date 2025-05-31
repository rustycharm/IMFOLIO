import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, User, Camera, Check } from "lucide-react";

export default function ProfilePictureManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Upload dedicated profile picture mutation
  const uploadProfilePicMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/user/profile-image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadProfilePicMutation.mutate(selectedFile);
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const currentProfileImage = (user as any)?.profileImageUrl;

  return (
    <div className="space-y-6">

      {/* Current Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {currentProfileImage ? (
                <img 
                  src={currentProfileImage} 
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {currentProfileImage ? "Profile picture set" : "No profile picture"}
              </p>
              <p className="text-sm text-gray-500">
                {currentProfileImage ? "Your custom profile picture is active" : "Upload a profile picture to personalize your account"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload New Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Upload New Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a square image (recommended 400x400px or larger). We'll automatically resize and optimize it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* File Selection */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!selectedFile ? (
              <div 
                onClick={triggerFileSelect}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Click to select an image</p>
                <p className="text-sm text-gray-500">Supports JPG, PNG, GIF up to 5MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleUpload}
                      disabled={uploadProfilePicMutation.isPending}
                      size="sm"
                    >
                      {uploadProfilePicMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                    <Button 
                      onClick={handleCancelSelection}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Options */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Tips for Best Results</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use a square image for the best fit</li>
              <li>• Choose a high-resolution image (at least 400x400px)</li>
              <li>• Your face should be clearly visible and well-lit</li>
              <li>• Keep the background simple for professional appearance</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Alternative: Use Portfolio Photo */}
      <PhotoSelector />
    </div>
  );
}

function PhotoSelector() {
  const { toast } = useToast();
  const [showPhotoGrid, setShowPhotoGrid] = useState(false);
  
  // Fetch user's photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ['/api/user/photos'],
    enabled: showPhotoGrid
  });

  // Set photo as profile picture mutation
  const setAsProfilePicMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return apiRequest('/api/user/profile-image/set-custom', {
        method: 'POST',
        body: JSON.stringify({ photoId })
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Picture Updated",
        description: "Selected photo is now your profile picture.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setShowPhotoGrid(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to set photo as profile picture. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoSelect = (photoId: number) => {
    setAsProfilePicMutation.mutate(photoId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Use Existing Photo</CardTitle>
        <CardDescription>
          Choose one of your uploaded photos as your profile picture
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showPhotoGrid ? (
          <Button 
            variant="outline" 
            onClick={() => setShowPhotoGrid(true)}
            className="w-full"
          >
            Choose from My Photos
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Select a Photo</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPhotoGrid(false)}
              >
                Cancel
              </Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading your photos...</p>
              </div>
            ) : photos && photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {photos.map((photo: any) => (
                  <div 
                    key={photo.id}
                    className="relative group cursor-pointer"
                    onClick={() => handlePhotoSelect(photo.id)}
                  >
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.title}
                      className="w-full h-24 object-cover rounded-lg hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all">
                      <Check className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                    {setAsProfilePicMutation.isPending && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No photos found. Upload some photos first.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/my-photos'}
                  className="mt-2"
                >
                  Upload Photos
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}