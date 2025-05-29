import { useState, useRef, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, Info, Sparkles, Check, Edit3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/tiff"];
const MAX_IMAGE_WIDTH = 2400; // Optimal width for web displays

export default function PhotoUploader({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [optimizedSize, setOptimizedSize] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [aiMetadata, setAiMetadata] = useState<any>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WEBP, HEIC, HEIF, or TIFF image.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 25MB.",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    setProcessingProgress(5); // Start progress indication

    // Start image optimization
    try {
      // Create preview and optimize image
      const optimizedImage = await optimizeImage(selectedFile);
      setPreview(optimizedImage);

      // Calculate optimized size from data URL
      const optimizedSizeBytes = Math.round((optimizedImage.length * 3) / 4) - 
        (optimizedImage.endsWith('==') ? 2 : optimizedImage.endsWith('=') ? 1 : 0);

      setOptimizedSize(optimizedSizeBytes);
      setProcessingProgress(100); // Complete progress

      // Generate AI suggestions for this image
      await generateAISuggestions(optimizedImage, selectedFile.name);
    } catch (error) {
      console.error("Error optimizing image:", error);
      toast({
        title: "Processing Error",
        description: "There was an error processing your image. Please try again with a different file.",
        variant: "destructive"
      });
      resetForm();
    }
  };

  // Process and optimize image for web with adaptive quality based on file size
  const optimizeImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = (e) => {
          setProcessingProgress(20);

          const img = document.createElement('img');
          img.onload = () => {
            setProcessingProgress(40);

            // Determine optimal dimensions based on image size
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Progressive optimization levels
            // For very large images, we use more aggressive resizing
            const originalSizeMB = file.size / (1024 * 1024);
            let targetWidth = MAX_IMAGE_WIDTH;
            let quality = 0.90; // Default high quality

            if (originalSizeMB > 15) {
              // Very large images: more aggressive optimization
              quality = 0.85;
              targetWidth = Math.min(MAX_IMAGE_WIDTH, 1800);
            } else if (originalSizeMB > 8) {
              // Large images: moderate optimization
              quality = 0.88;
              targetWidth = Math.min(MAX_IMAGE_WIDTH, 2000);
            }

            // Preserve aspect ratio when resizing
            if (width > targetWidth) {
              const ratio = targetWidth / width;
              width = targetWidth;
              height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;

            setProcessingProgress(60);

            // Draw image on canvas with smooth interpolation for better quality
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Enable image smoothing for better quality
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);

              // Extract EXIF data if we want to preserve it in the future
              // For now, we're simplifying by not including it

              setProcessingProgress(80);

              // Create WebP for browsers that support it (better compression with high quality)
              // Fall back to high-quality JPEG for maximum compatibility
              let optimizedDataUrl;

              // Try WebP first with fallback to JPEG
              try {
                optimizedDataUrl = canvas.toDataURL('image/webp', quality);
                // If WebP is not supported or produces larger file, fall back to JPEG
                if (optimizedDataUrl.length > e.target?.result?.toString().length || 
                    optimizedDataUrl.indexOf('data:image/webp') !== 0) {
                  optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }
              } catch (err) {
                // Fallback to JPEG if WebP fails
                optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
              }

              setProcessingProgress(95);
              resolve(optimizedDataUrl);
            } else {
              reject(new Error("Could not get canvas context"));
            }
          };

          img.onerror = () => {
            reject(new Error("Failed to load image"));
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };

        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  };

  // Convert data URL to Blob for upload
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  };

  // Upload to cloud storage and get URL
  const uploadToCloudStorage = async (dataURL: string): Promise<string> => {
    try {
      setUploading(true);

      // For simplicity, we'll use our optimized data URL directly
      // In a production app, you would upload to S3, Cloudinary, etc.

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return dataURL; // Return optimized data URL as the "cloud" URL
    } finally {
      setUploading(false);
    }
  };

  // Clear the form
  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setAiMetadata(null);
    setShowAiSuggestions(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Generate AI suggestions and pre-populate form fields
  const generateAISuggestions = async (imageDataUrl: string, filename: string) => {
    console.log('🎯 CLIENT: Starting AI analysis for:', filename);
    setAiAnalyzing(true);
    
    try {
      console.log('🔄 CLIENT: Converting data URL to blob...');
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      console.log('📦 CLIENT: Blob created, size:', (blob.size / 1024).toFixed(1) + 'KB');
      
      // Create form data for AI analysis
      const formData = new FormData();
      formData.append('image', blob, filename);
      console.log('📋 CLIENT: FormData prepared, making API request...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ CLIENT: Request timed out after 15 seconds');
        controller.abort();
      }, 15000); // 15 second timeout
      
      console.log('🚀 CLIENT: Sending request to /api/photos/ai-analyze');
      const startTime = Date.now();
      
      const aiResponse = await apiRequest('/api/photos/ai-analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      const duration = Date.now() - startTime;
      console.log(`⚡ CLIENT: Request completed in ${duration}ms`);
      clearTimeout(timeoutId);

      console.log('📨 CLIENT: AI response received:', aiResponse);

      if (aiResponse.suggestions) {
        const suggestions = aiResponse.suggestions;
        console.log('✨ CLIENT: Processing AI suggestions:', {
          title: suggestions.title,
          category: suggestions.category,
          hasDescription: !!suggestions.description,
          tagCount: suggestions.tags?.length || 0
        });
        
        // Pre-populate form fields with AI suggestions
        if (suggestions.title) {
          console.log('📝 CLIENT: Setting title:', suggestions.title);
          setTitle(suggestions.title);
        }
        if (suggestions.category) {
          console.log('🏷️ CLIENT: Setting category:', suggestions.category);
          setCategory(suggestions.category);
        }
        if (suggestions.description) {
          console.log('📄 CLIENT: Setting description length:', suggestions.description.length);
          setDescription(suggestions.description);
        }
        
        setAiMetadata(suggestions);
        
        toast({
          title: "✨ AI Enhanced Your Photo!",
          description: "Smart suggestions have been added to your form fields. Review and edit as needed.",
        });
        console.log('🎉 CLIENT: AI suggestions applied successfully!');
      } else {
        console.log('⚠️ CLIENT: No suggestions in response');
      }
    } catch (error: any) {
      console.error('❌ CLIENT: AI analysis error:', error);
      console.error('🔍 CLIENT: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      if (error.name === 'AbortError') {
        console.log('⏰ CLIENT: Request was aborted due to timeout');
        toast({
          title: "AI Analysis Timeout",
          description: "AI analysis took too long. You can still upload your photo manually.",
          variant: "destructive"
        });
      } else {
        console.log('🔄 CLIENT: Continuing with manual entry due to error');
      }
      // Silently continue - AI is enhancement, not requirement
    } finally {
      console.log('🏁 CLIENT: AI analysis process finished');
      setAiAnalyzing(false);
    }
  };

  // Create photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoData: { 
      title: string, 
      imageUrl: string, 
      category: string,
      description: string 
    }) => {
      try {
        console.log('Uploading photo with data:', JSON.stringify({
          title: photoData.title,
          category: photoData.category,
          description: photoData.description?.substring(0, 20) + '...' // Log partial description
        }));

        // Convert data URL to FormData for robust file upload
        const formData = new FormData();
        
        // Convert data URL to blob
        const response = await fetch(photoData.imageUrl);
        const blob = await response.blob();
        
        // Create file from blob with proper extension based on MIME type
        const extension = blob.type === 'image/webp' ? '.webp' : '.jpg';
        const file = new File([blob], `${photoData.title.replace(/[^a-zA-Z0-9]/g, '_')}${extension}`, {
          type: blob.type
        });
        
        formData.append('image', file);
        formData.append('title', photoData.title);
        formData.append('category', photoData.category);
        formData.append('description', photoData.description);
        formData.append('imageType', 'photo'); // Enhanced validation parameter

        const uploadResponse = await apiRequest('/api/photos/upload', {
          method: 'POST',
          body: formData
        });

        console.log('Photo upload successful, server response:', uploadResponse);
        return uploadResponse;
      } catch (error) {
        console.error('Photo upload error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Photo Uploaded Successfully!",
        description: "Your photo has been uploaded and is now in your portfolio."
      });
      
      // Always reset form and close dialog after successful upload
      resetForm();
      if (onSuccess) onSuccess();
      
      queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your photo. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !preview || !title || !category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select an image.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload the optimized image and get URL
      const imageUrl = await uploadToCloudStorage(preview);

      // Create the photo entry
      uploadPhotoMutation.mutate({
        title,
        imageUrl,
        category,
        description
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error processing your image. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-h-[85vh] flex flex-col">
      <CardContent className="pt-6 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Photo</Label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
                ${preview ? 'border-gray-300' : 'border-gray-300 hover:border-primary'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {processingProgress > 0 && processingProgress < 100 ? (
                <div className="py-10 flex flex-col items-center">
                  <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
                  <p className="text-sm font-medium mb-2">Optimizing your image...</p>
                  <div className="w-full max-w-xs mb-2">
                    <Progress value={processingProgress} className="h-2" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Maintaining quality while reducing size
                  </p>
                </div>
              ) : aiAnalyzing ? (
                <div className="py-10 flex flex-col items-center">
                  <Sparkles className="h-12 w-12 mx-auto text-purple-600 animate-pulse mb-4" />
                  <p className="text-sm font-medium mb-2">AI analyzing your photo...</p>
                  <div className="w-full max-w-xs mb-2">
                    <Progress value={100} className="h-2 animate-pulse" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Generating smart suggestions for title, category, and description
                  </p>
                </div>
              ) : preview ? (
                <div className="relative">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-[300px] mx-auto rounded-md"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setPreview(null);
                      setOriginalSize(0);
                      setOptimizedSize(0);
                      setProcessingProgress(0);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Size comparison stats */}
                  {originalSize > 0 && optimizedSize > 0 && (
                    <div className="mt-2 bg-white dark:bg-slate-900 p-2 rounded-md border text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="flex items-center">
                          <Info className="h-3 w-3 mr-1 text-blue-500" />
                          Size optimization
                        </span>
                        <span className="font-semibold text-green-600">
                          {Math.round((1 - (optimizedSize / originalSize)) * 100)}% smaller
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Original: {(originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>Optimized: {(optimizedSize / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-10">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm font-medium">
                    Drag and drop or click to upload
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG, WEBP, HEIC, HEIF, or TIFF up to 25MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your photo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category*</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nature">Nature</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="architecture">Architecture</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="street">Street</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
                <SelectItem value="wildlife">Wildlife</SelectItem>
                <SelectItem value="macro">Macro</SelectItem>
                <SelectItem value="blackandwhite">Black & White</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this photo"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-200 dark:border-blue-800">
              Photos are private by default. To make them visible on your public portfolio, you'll need to toggle them to public in the "My Photos" section after upload.
            </p>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!file || !title || !category || uploading || uploadPhotoMutation.isPending}
                className="w-full sm:w-auto"
              >
                {(uploading || uploadPhotoMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {uploading ? "Processing..." : 
                  uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}