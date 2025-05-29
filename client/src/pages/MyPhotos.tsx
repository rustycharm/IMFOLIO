import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Upload, Trash2, Search, Palette, Edit } from "lucide-react";
import { generatePortfolioUrl } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PhotoUploader from "@/components/PhotoUploader";
import CategoryCarousel from "@/components/CategoryCarousel";
import CategoryManager from "@/components/CategoryManager";

export default function MyPhotos() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrivate, setShowPrivate] = useState(true);
  const [showPublic, setShowPublic] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    category: "",
    tags: [] as string[]
  });

  // Check for upload=true in the URL to auto-open the upload dialog
  useEffect(() => {
    if (location.includes('?upload=true')) {
      setUploadDialogOpen(true);
    }
  }, [location]);

  // Populate edit form when a photo is selected for editing
  useEffect(() => {
    if (editingPhoto) {
      setEditFormData({
        title: editingPhoto.title || "",
        description: editingPhoto.description || "",
        category: editingPhoto.category || "",
        tags: editingPhoto.tags || []
      });
    }
  }, [editingPhoto]);

  // Redirect non-authenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your photos.",
        variant: "destructive"
      });
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation, toast]);

  // Get user's photos
  const { data: photos, isLoading } = useQuery({
    queryKey: ['/api/user/photos'],
    queryFn: () => apiRequest('/api/user/photos'),
    enabled: isAuthenticated
  });

  // Filter photos based on selected category, search query, and privacy state
  const filteredPhotos = Array.isArray(photos) 
    ? photos.filter(photo => {
        const matchesCategory = selectedCategory === "all" || photo.category === selectedCategory;
        const matchesSearch = !searchQuery || 
          (photo.title && photo.title.toLowerCase().includes(searchQuery.toLowerCase())) || 
          (photo.description && photo.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesPrivacy = (photo.isPublic && showPublic) || (!photo.isPublic && showPrivate);
        return matchesCategory && matchesSearch && matchesPrivacy;
      })
    : [];

  // Update photo featured status
  const updateFeaturedMutation = useMutation({
    mutationFn: ({ id, featured }: { id: number, featured: boolean }) => {
      return apiRequest(`/api/user/photos/${id}/featured`, {
        method: "POST",
        body: JSON.stringify({ featured }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onMutate: async ({ id, featured }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/user/photos'] });

      // Snapshot the previous value
      const previousPhotos = queryClient.getQueryData(['/api/user/photos']);

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/user/photos'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo: any) => 
          photo.id === id ? { ...photo, featured } : photo
        );
      });

      // Return a context object with the snapshotted value
      return { previousPhotos };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPhotos) {
        queryClient.setQueryData(['/api/user/photos'], context.previousPhotos);
      }
      toast({
        title: "Update failed",
        description: "Featured status could not be updated.",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({
        title: "Photo updated",
        description: "Featured status has been updated successfully."
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
    }
  });

  // Update photo public status
  const updatePublicMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: number, isPublic: boolean }) => {
      return apiRequest(`/api/user/photos/${id}/public`, {
        method: "POST",
        body: JSON.stringify({ isPublic }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
      toast({
        title: "Photo updated",
        description: "Privacy status has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Edit photo metadata mutation
  const editPhotoMutation = useMutation({
    mutationFn: (data: { id: number; title: string; description: string; category: string; tags: string[] }) => {
      return apiRequest(`/api/user/photos/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          category: data.category,
          tags: data.tags
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
      toast({
        title: "Photo updated",
        description: "Photo metadata has been updated successfully."
      });
      setEditDialogOpen(false);
      setEditingPhoto(null);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/user/photos/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
      toast({
        title: "Photo deleted",
        description: "Photo has been permanently deleted."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Consistent Navigation Layout */}
      <nav className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Left side: IMFOLIO.COM branding */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-light text-black uppercase tracking-wider hover:text-gray-600 transition-colors">
              IMFOLIO.COM
            </Link>
          </div>
          
          {/* Right side: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Home</Link>
            {(user as any)?.role === 'admin' && (
              <Link href="/admin/dashboard" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Admin Dashboard</Link>
            )}
            <Link href={generatePortfolioUrl(user)} className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Portfolio</Link>
            <Link href="/account" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">My Account</Link>
            <button 
              onClick={() => window.location.href = '/api/logout'}
              className="px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase"
            >
              Sign Out
            </button>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center ml-auto">
            <Link href="/account" className="text-black hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>
      
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="flex flex-col justify-start items-start">
            <div>
              <h1 className="text-3xl font-light text-black">My Photos</h1>
              <p className="text-black font-light">Manage and organize your photo collection</p>
            </div>
          </div>

          {/* Account Navigation Tabs */}
          <Tabs defaultValue="photos" value="photos" className="w-full">
            <TabsList className="w-full overflow-x-auto flex md:grid md:grid-cols-5 gap-2 md:gap-0 p-1">
              <TabsTrigger value="photos" className="whitespace-nowrap flex-shrink-0">My Photos</TabsTrigger>
              <TabsTrigger 
                value="profile" 
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => setLocation("/account?tab=profile")}
              >
                Edit Profile
              </TabsTrigger>
              <TabsTrigger 
                value="hero" 
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => setLocation("/account?tab=hero")}
              >
                Hero Image
              </TabsTrigger>
              <TabsTrigger 
                value="avatar" 
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => setLocation("/account?tab=avatar")}
              >
                Profile Picture
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="whitespace-nowrap flex-shrink-0"
                onClick={() => setLocation("/account?tab=settings")}
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Custom Category Manager */}
          <div className="mb-8">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Manage Custom Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Custom Categories</DialogTitle>
                  <DialogDescription>
                    Create and manage your own custom photo categories to better organize your portfolio.
                  </DialogDescription>
                </DialogHeader>
                <CategoryManager />
              </DialogContent>
            </Dialog>
          </div>

          {/* Category filter and search */}
          <div className="mb-8">
            <div className="mb-4">
              <CategoryCarousel 
                selectedCategory={selectedCategory} 
                onCategoryChange={setSelectedCategory}
              />
            </div>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Privacy Filter Toggles */}
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showPublic}
                    onCheckedChange={setShowPublic}
                    id="show-public"
                  />
                  <label htmlFor="show-public" className="cursor-pointer">Public Photos</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showPrivate}
                    onCheckedChange={setShowPrivate}
                    id="show-private"
                  />
                  <label htmlFor="show-private" className="cursor-pointer">Private Photos</label>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-5xl font-light mb-2">
                  {filteredPhotos.length}
                </div>
                <p className="text-gray-500 font-medium">Total Photos</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-5xl font-light mb-2">
                  {filteredPhotos.filter(p => p.isPublic).length}
                </div>
                <p className="text-gray-500 font-medium">Public</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-5xl font-light mb-2">
                  {filteredPhotos.filter(p => p.featured).length}
                </div>
                <p className="text-gray-500 font-medium">Featured</p>
              </CardContent>
            </Card>
          </div>

          {/* Upload Photo Button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Photos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Photos</DialogTitle>
                  <DialogDescription>
                    Add new photos to your portfolio. Choose files and add descriptions.
                  </DialogDescription>
                </DialogHeader>
                <PhotoUploader onSuccess={() => {
                  setUploadDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/user/photos'] });
                }} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Photos Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Photo Collection
              </CardTitle>
              <CardDescription>
                Showing {filteredPhotos.length} of {Array.isArray(photos) ? photos.length : 0} photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading photos...</div>
              ) : filteredPhotos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {Array.isArray(photos) && photos.length === 0 
                    ? "No photos uploaded yet. Click 'Upload Photos' to get started!"
                    : "No photos match your current filters."
                  }
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Photo</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPhotos.map((photo: any) => (
                      <TableRow key={photo.id}>
                        <TableCell>
                          <img 
                            src={photo.imageUrl} 
                            alt={photo.title}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{photo.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{photo.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={photo.isPublic}
                            onCheckedChange={(checked) => 
                              updatePublicMutation.mutate({ id: photo.id, isPublic: checked })
                            }
                          />
                          <span className="ml-2 text-sm">
                            {photo.isPublic ? 'Public' : 'Private'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={photo.featured}
                            onCheckedChange={(checked) => 
                              updateFeaturedMutation.mutate({ id: photo.id, featured: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPhoto(photo);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${photo.title}?`)) {
                                  deletePhotoMutation.mutate(photo.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Edit Photo Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Photo Metadata</DialogTitle>
                <DialogDescription>
                  Update the title, description, category, and tags for your photo.
                </DialogDescription>
              </DialogHeader>
              {editingPhoto && <EditPhotoForm 
                photo={editingPhoto} 
                onSubmit={(data) => editPhotoMutation.mutate({ ...data, id: editingPhoto.id })}
                isLoading={editPhotoMutation.isPending}
              />}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Edit Photo Form Component
function EditPhotoForm({ photo, onSubmit, isLoading }: { 
  photo: any; 
  onSubmit: (data: { title: string; description: string; category: string; tags: string[] }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(photo.title || '');
  const [description, setDescription] = useState(photo.description || '');
  const [category, setCategory] = useState(photo.category || '');
  const [tagsInput, setTagsInput] = useState((photo.tags || []).join(', '));

  const categories = [
    'landscape', 'portrait', 'street', 'wedding', 'event', 'commercial', 
    'fashion', 'nature', 'architecture', 'travel', 'documentary', 'artistic', 'other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onSubmit({ title, description, category, tags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        <div className="w-24 h-24 flex-shrink-0">
          <img 
            src={photo.imageUrl} 
            alt={photo.title}
            className="w-full h-full object-cover rounded-md"
          />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter photo title"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter photo description"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Enter tags separated by commas"
        />
        <p className="text-sm text-gray-500 mt-1">
          Separate multiple tags with commas (e.g., sunset, beach, vacation)
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setEditDialogOpen(false)}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Photo"}
        </Button>
      </div>
    </form>
  );
}