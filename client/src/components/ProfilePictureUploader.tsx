import React, { useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, X, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface ProfilePictureUploaderProps {
  currentImageUrl: string | null;
  onImageUploaded: (imageUrl: string) => void;
}

export default function ProfilePictureUploader({ 
  currentImageUrl,
  onImageUploaded 
}: ProfilePictureUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handler for when user clicks the upload button
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handler for when a file is selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Create a preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload the image
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await apiRequest('/api/user/profile-image', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header with FormData
          // Browser will set it automatically with the boundary
        }
      });
      
      if (response.imageUrl) {
        toast({
          title: "Success!",
          description: "Profile picture updated successfully",
        });
        onImageUploaded(response.imageUrl);
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Handler for removing the profile picture
  const handleRemoveImage = async () => {
    try {
      setIsUploading(true);
      
      await apiRequest('/api/user/profile-image', {
        method: 'DELETE'
      });
      
      setPreviewUrl(null);
      onImageUploaded('');
      
      // Invalidate user data to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Profile picture removed",
        description: "Your profile picture has been removed successfully"
      });
    } catch (error) {
      console.error('Error removing profile image:', error);
      toast({
        title: "Removal failed",
        description: "There was a problem removing your profile picture. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Function to optimize image before upload
  const optimizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Calculate new dimensions (max 500x500)
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        // Set canvas dimensions and draw resized image
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          0.85 // Quality
        );
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Load image from file
      img.src = URL.createObjectURL(file);
    });
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="w-36 h-36 border-2 border-gray-200 dark:border-gray-700">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt="Profile" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary">
              <Camera className="w-10 h-10" />
            </AvatarFallback>
          )}
        </Avatar>
        
        {previewUrl && (
          <button
            onClick={handleRemoveImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
            disabled={isUploading}
            aria-label="Remove profile picture"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-1 w-full">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        
        <Button
          onClick={handleButtonClick}
          variant="secondary"
          size="sm"
          disabled={isUploading}
          className="flex items-center gap-2 mt-2"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading...' : 'Choose Photo'}
        </Button>
      </div>
    </div>
  );
}