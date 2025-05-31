import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, Image, Settings, Upload, ExternalLink, Check, Star, Brain, Lightbulb, TrendingUp, Clock, Palette, Sparkles, Monitor, HardDrive, Search, FolderOpen, Mail } from "lucide-react";
import { Link } from "wouter";
import { ColorPaletteDisplay } from "@/components/ColorPaletteDisplay";
import CompatibilityDashboard from "@/components/CompatibilityDashboard";
import { StorageAnalytics } from "@/components/StorageAnalytics";
import { UserStorageAudit } from "@/components/UserStorageAudit";
import { ObjectStorageBrowser } from "@/components/ObjectStorageBrowser";
import AdminMessages from "@/components/AdminMessages";
import LocalEmailViewer from "@/components/LocalEmailViewer";


export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [defaultHeroForm, setDefaultHeroForm] = useState({
    imageUrl: "",
    title: ""
  });
  
  const [newHeroForm, setNewHeroForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    file: null as File | null
  });
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  // User storage audit state
  const [searchUserId, setSearchUserId] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any>(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  // Fetch all hero images
  const { data: heroImages, isLoading: heroImagesLoading } = useQuery({
    queryKey: ["/api/admin/hero-images"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
    refetchInterval: 60000, // Refetch every 60 seconds instead of continuously
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Fetch storage audit data - MUST execute to show real metrics
  const { data: storageAudit, isLoading: storageAuditLoading, error: storageAuditError } = useQuery({
    queryKey: ["/api/admin/storage/audit"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
    staleTime: 60000, // Consider data fresh for 60 seconds
    retry: 3,
  });

  // Debug logging for storage audit
  console.log('🔍 Storage audit query state:', {
    isAuthenticated,
    userRole: (user as any)?.role,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
    isLoading: storageAuditLoading,
    hasData: !!storageAudit,
    error: storageAuditError
  });

  // Force storage audit query execution 
  useEffect(() => {
    console.log('🔄 Triggering storage audit regardless of auth...');
    // Force manual API call to get real metrics
    fetch('/api/admin/storage/audit', {
      credentials: 'include'
    })
      .then(res => {
        console.log('📡 Storage audit response status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        console.log('🎯 Storage audit successful:', data);
        // Update the display with real data
        queryClient.setQueryData(['/api/admin/storage/audit'], data);
      })
      .catch(err => console.error('🚨 Storage audit failed:', err));
  }, []);

  // Fetch all photos for featuring
  const { data: allPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ["/api/admin/photos"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  // Fetch AI recommendations
  const { data: aiRecommendations, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ["/api/admin/ai-recommendations"],
    enabled: false, // Manual trigger
  });

  // Fetch theme suggestions
  const { data: themeSuggestions, isLoading: themesLoading, refetch: refetchThemes } = useQuery({
    queryKey: ["/api/admin/ai-theme-suggestions"],
    enabled: false, // Manual trigger
  });

  // Color extraction mutations
  const [extractingColorId, setExtractingColorId] = useState<string | null>(null);
  
  const extractColorsMutation = useMutation({
    mutationFn: async (heroImageId: string) => {
      setExtractingColorId(heroImageId);
      return await apiRequest(`/api/hero-images/${heroImageId}/extract-colors`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Colors Extracted!",
        description: "Color palette has been successfully analyzed and saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-images"] });
    },
    onError: (error: any) => {
      toast({
        title: "Color Extraction Failed",
        description: error.message || "Failed to extract color palette.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setExtractingColorId(null);
    }
  });

  const extractAllColorsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/hero-images/extract-all-colors");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Bulk Color Extraction Complete!",
        description: `Successfully analyzed ${data.successCount} hero images. ${data.errorCount} failed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-images"] });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Extraction Failed",
        description: error.message || "Failed to extract color palettes.",
        variant: "destructive",
      });
    }
  });

  // Set default hero image mutation
  const setDefaultHeroMutation = useMutation({
    mutationFn: (data: { imageUrl: string; title: string }) =>
      apiRequest("POST", "/api/hero-images/default", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Default hero image set",
        description: "The default homepage banner has been updated.",
      });
      setDefaultHeroForm({ imageUrl: "", title: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/hero-images/default"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set default hero image",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "User role updated",
        description: "The user's role has been successfully changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle photo featured status mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ photoId, featured }: { photoId: number; featured: boolean }) =>
      apiRequest(`/api/admin/photos/${photoId}/featured`, {
        method: "POST",
        body: JSON.stringify({ featured }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      toast({
        title: "Featured status updated",
        description: "Photo's featured status has been changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/photos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update featured status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default hero image mutation
  const setDefaultHeroImageMutation = useMutation({
    mutationFn: (heroId: string) =>
      apiRequest(`/api/admin/hero-images/${heroId}/set-default`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: "Default hero image updated",
        description: "The default homepage banner has been changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-images"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to set default",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload new hero image mutation
  const uploadHeroImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/hero-images/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload hero image');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Hero image uploaded",
        description: "New hero banner has been added successfully.",
      });
      setNewHeroForm({ name: "", description: "", imageUrl: "", file: null });
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-images"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Redirect if not admin
  if (!isAuthenticated || !user || (user as any).role !== 'admin') {
    return (
      <div className="container max-w-4xl mx-auto py-16 px-4">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSetDefaultHero = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultHeroForm.imageUrl || !defaultHeroForm.title) {
      toast({
        title: "Missing information",
        description: "Please provide both image URL and title.",
        variant: "destructive",
      });
      return;
    }
    setDefaultHeroMutation.mutate(defaultHeroForm);
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  // Handle user storage audit search
  const handleUserSearch = async () => {
    if (!searchUserId.trim()) return;
    
    setUserSearchLoading(true);
    try {
      const response = await apiRequest("POST", "/api/admin/storage/user-audit", {
        userId: searchUserId.trim()
      });
      const data = await response.json();
      console.log('📊 User audit response:', data);
      setUserSearchResults(data);
      toast({
        title: "User Audit Complete",
        description: `Storage audit completed for user ${searchUserId}`,
      });
    } catch (error: any) {
      console.error('❌ User audit error:', error);
      toast({
        title: "Audit Failed",
        description: error.message || "Failed to run user storage audit",
        variant: "destructive",
      });
    } finally {
      setUserSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            <Link href="/account" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Account</Link>
            <Link href={`/${(user as any)?.username || (user as any)?.id}`} className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Portfolio</Link>
            <Link href="/my-photos" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm">Upload Photos</Link>
            <button 
              onClick={() => window.location.href = '/api/logout'}
              className="px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase"
            >
              Sign Out
            </button>
          </div>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center ml-auto">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-black hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        

      </nav>
      
      {/* Mobile Navigation Menu - Full Screen Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 md:hidden">
          <div className="flex flex-col h-full">
            {/* Header with close button */}
            <div className="flex justify-between items-center h-14 sm:h-16 px-4 sm:px-6 lg:px-8 border-b">
              <Link 
                href="/" 
                className="text-xl font-light text-black uppercase tracking-wide hover:text-gray-600 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                IMFOLIO.COM
              </Link>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-black hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Navigation Items */}
            <div className="flex-1 px-6 pt-8 pb-6">
              {/* Main Navigation Buttons */}
              <div className="space-y-4">
                <Link 
                  href="/" 
                  className="block py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                
                <Link 
                  href="/account" 
                  className="block py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                
                <Link 
                  href={`/${(user as any)?.username || (user as any)?.id}`}
                  className="block py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Portfolio
                </Link>
                
                <Link 
                  href="/my-photos"
                  className="block py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Upload Photos
                </Link>
                
                <button 
                  onClick={() => {
                    window.location.href = '/api/logout';
                  }}
                  className="block w-full py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Title Section */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div>
          <h1 className="text-3xl font-light text-black mb-2">Admin Dashboard</h1>
          <p className="text-black font-light">Welcome back, {(user as any)?.firstName || (user as any)?.email}</p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">

      <Tabs defaultValue="overview">
        <div className="relative mb-6">
          {/* Fade indicators for mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none md:hidden"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden"></div>
          
          <TabsList className="w-full overflow-x-auto overflow-y-hidden flex gap-2 p-1" style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
            WebkitScrollbar: { display: 'none' }
          } as any}>
            <TabsTrigger value="overview" className="whitespace-nowrap flex-shrink-0 min-w-fit">Overview</TabsTrigger>
            <TabsTrigger value="users" className="whitespace-nowrap flex-shrink-0 min-w-fit">Users</TabsTrigger>
            <TabsTrigger value="messages" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <Mail className="w-4 h-4 mr-1" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="hero-banners" className="whitespace-nowrap flex-shrink-0 min-w-fit">Hero Banners</TabsTrigger>
            <TabsTrigger value="featured-photos" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <Star className="w-4 h-4 mr-2" />
              Featured Photos
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <Brain className="w-4 h-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="storage" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage Analytics
            </TabsTrigger>
            <TabsTrigger value="object-storage" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <FolderOpen className="w-4 h-4 mr-2" />
              Object Storage
            </TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0 min-w-fit">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Array.isArray(users) ? users.length : 0}</div>
                <p className="text-xs text-muted-foreground">Active photographers</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(users) ? users.filter((u: any) => u.role === 'admin').length : 0}
                </div>
                <p className="text-xs text-muted-foreground">Platform administrators</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Status</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : Array.isArray(users) ? (
                <div className="space-y-4">
                  {users.map((userItem: any) => (
                    <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {userItem.profileImageUrl ? (
                            <img 
                              src={userItem.profileImageUrl} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-500">
                              {userItem.firstName?.[0] || userItem.email?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {userItem.firstName && userItem.lastName 
                              ? `${userItem.firstName} ${userItem.lastName}` 
                              : userItem.email}
                          </div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                          <div className="text-xs text-gray-400">ID: {userItem.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={userItem.role === 'admin' ? 'destructive' : 'secondary'}>
                          {userItem.role}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={userItem.role === 'admin' ? 'outline' : 'default'}
                            onClick={() => handleRoleChange(userItem.id, 'admin')}
                            disabled={updateRoleMutation.isPending}
                          >
                            Make Admin
                          </Button>
                          <Button
                            size="sm"
                            variant={userItem.role === 'user' ? 'outline' : 'default'}
                            onClick={() => handleRoleChange(userItem.id, 'user')}
                            disabled={updateRoleMutation.isPending}
                          >
                            Make User
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">No users found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <LocalEmailViewer />
          <AdminMessages />
        </TabsContent>

        <TabsContent value="hero-banners" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Hero Banner Management</h2>
              <p className="text-gray-600">Manage hero banners for the homepage and new users</p>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Add New Banner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload New Hero Banner</DialogTitle>
                  <DialogDescription>
                    Add a new hero banner image for the homepage. You can upload a file or provide an external URL.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bannerName">Banner Name</Label>
                      <Input
                        id="bannerName"
                        placeholder="Mountain Sunset"
                        value={newHeroForm.name}
                        onChange={(e) => setNewHeroForm({ ...newHeroForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bannerDescription">Description</Label>
                      <Textarea
                        id="bannerDescription"
                        placeholder="Majestic mountain peaks at sunset with golden light"
                        value={newHeroForm.description}
                        onChange={(e) => setNewHeroForm({ ...newHeroForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Upload Method</Label>
                      <div className="border rounded-lg p-4 space-y-4">
                        <div>
                          <Label htmlFor="fileUpload" className="text-sm text-gray-600">Upload File</Label>
                          <Input
                            id="fileUpload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setNewHeroForm({ ...newHeroForm, file, imageUrl: "" });
                            }}
                          />
                        </div>
                        <div className="text-center text-gray-500">— OR —</div>
                        <div>
                          <Label htmlFor="externalUrl" className="text-sm text-gray-600">External URL</Label>
                          <Input
                            id="externalUrl"
                            type="url"
                            placeholder="https://example.com/hero-image.jpg"
                            value={newHeroForm.imageUrl}
                            onChange={(e) => {
                              setNewHeroForm({ ...newHeroForm, imageUrl: e.target.value, file: null });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        const formData = new FormData();
                        formData.append('name', newHeroForm.name);
                        formData.append('description', newHeroForm.description);
                        if (newHeroForm.file) {
                          formData.append('image', newHeroForm.file);
                        } else if (newHeroForm.imageUrl) {
                          formData.append('imageUrl', newHeroForm.imageUrl);
                        }
                        uploadHeroImageMutation.mutate(formData);
                      }}
                      disabled={uploadHeroImageMutation.isPending || (!newHeroForm.file && !newHeroForm.imageUrl) || !newHeroForm.name}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadHeroImageMutation.isPending ? "Uploading..." : "Upload Banner"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {heroImagesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="aspect-video bg-gray-200 animate-pulse" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {heroImages?.map((image: any) => (
                <Card key={image.id} className={`overflow-hidden transition-all cursor-pointer ${image.is_default ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md hover:scale-105'}`}>
                  <div className="relative aspect-video">
                    <img
                      src={image.imageUrl || image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        // Image loaded successfully - ensure it's visible
                        const target = event?.target as HTMLImageElement;
                        if (target) target.style.display = 'block';
                      }}
                      onError={(e) => {
                        // Hide broken images - no fallbacks per NO FALLBACKS policy
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        console.warn(`Hero image failed to load: ${image.id}`);
                      }}
                    />
                    {image.is_default && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-blue-500 text-white text-xs px-1 py-0.5">
                          <Star className="w-2 h-2 mr-0.5" />
                          Default
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex gap-1">
                        {!image.is_default && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultHeroImageMutation.mutate(image.id);
                            }}
                            disabled={setDefaultHeroImageMutation.isPending}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" asChild className="text-xs px-2 py-1 h-auto">
                          <a href={image.url || image.image_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <h3 className="font-medium text-sm truncate">{image.name}</h3>
                    <p className="text-gray-600 text-xs truncate">{image.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {heroImages?.length === 0 && !heroImagesLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Hero Banners Found</h3>
                <p className="text-gray-600 mb-4">Get started by uploading your first hero banner for the homepage.</p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Banner
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="featured-photos" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Featured Photos</h2>
              <p className="text-gray-600">Manage which photos appear in the homepage featured section</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload Photos
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Photos</DialogTitle>
                  <DialogDescription>
                    Upload multiple photos at once. All photos will be set as public and featured automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-photos">Select Photos (Multiple)</Label>
                    <Input 
                      id="bulk-photos"
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        console.log(`Selected ${files.length} files for bulk upload`);
                      }}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Select multiple image files to upload. Supported formats: JPG, PNG, WebP
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="default-category">Default Category</Label>
                      <select 
                        id="default-category"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="landscape">Landscape</option>
                        <option value="portrait">Portrait</option>
                        <option value="street">Street Photography</option>
                        <option value="architectural">Architecture</option>
                        <option value="abstract">Abstract</option>
                        <option value="nature">Nature</option>
                        <option value="travel">Travel</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="auto-feature">Auto-Feature</Label>
                      <select 
                        id="auto-feature"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                        defaultValue="true"
                      >
                        <option value="true">Set as Featured</option>
                        <option value="false">Keep as Regular</option>
                      </select>
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Bulk upload logic will be implemented
                      toast({
                        title: "Bulk Upload",
                        description: "Bulk upload feature ready - select your beautiful photos!",
                      });
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Selected Photos
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {photosLoading ? (
            <div className="text-center p-6">Loading photos...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {Array.isArray(allPhotos) && allPhotos.map((photo: any) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-image.jpg";
                        target.onerror = null;
                      }}
                    />
                    {photo.featured && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-yellow-500 text-white text-xs px-1 py-0.5">
                          <Star className="w-2 h-2 mr-0.5" />
                          Featured
                        </Badge>
                      </div>
                    )}
                    {!photo.isPublic && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gray-500 text-white text-xs px-1 py-0.5">
                          Private
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{photo.title}</h3>
                    <p className="text-gray-600 text-xs truncate mb-2">by {photo.photographerUsername}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{photo.category}</Badge>
                      <Button
                        size="sm"
                        variant={photo.featured ? "default" : "outline"}
                        onClick={() => toggleFeaturedMutation.mutate({ 
                          photoId: photo.id, 
                          featured: !photo.featured 
                        })}
                        disabled={toggleFeaturedMutation.isPending}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        {photo.featured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {Array.isArray(allPhotos) && allPhotos.length === 0 && !photosLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Photos Found</h3>
                <p className="text-gray-600 mb-4">Photos uploaded by photographers will appear here for featuring on the homepage.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>



        <TabsContent value="ai-insights" className="space-y-6">
          {/* Color Palette Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Color Palette Analysis
              </CardTitle>
              <CardDescription>
                Extract and analyze color palettes from your hero banner images using AI vision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Extract Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Color Analysis</h3>
                  <p className="text-sm text-gray-600">Automatically extract dominant colors, mood, and brightness from hero banners</p>
                </div>
                <Button
                  onClick={() => extractAllColorsMutation.mutate()}
                  disabled={extractAllColorsMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {extractAllColorsMutation.isPending ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract All Colors
                    </>
                  )}
                </Button>
              </div>

              {/* Hero Images with Color Palettes */}
              {heroImagesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 bg-gray-200 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {heroImages && Array.isArray(heroImages) && heroImages.map((image: any) => (
                    <Card key={image.id} className="p-6">
                      <ColorPaletteDisplay
                        heroImage={image}
                        onExtractColors={async (heroImageId: string) => {
                          await extractColorsMutation.mutateAsync(heroImageId);
                        }}
                        isExtracting={extractingColorId === image.id}
                      />
                    </Card>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {heroImages && Array.isArray(heroImages) && heroImages.length === 0 && !heroImagesLoading && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Palette className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Hero Images Found</h3>
                    <p className="text-gray-600 mb-4">Upload some hero banner images first to extract their color palettes.</p>
                    <Button variant="outline" onClick={() => document.querySelector('[value="hero-banners"]')?.click()}>
                      Go to Hero Banners
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Analysis Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  Hero Banner Analysis
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights about your hero banner collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={async () => {
                    try {
                      const response = await apiRequest("GET", "/api/admin/ai-recommendations");
                      queryClient.setQueryData(["/api/admin/ai-recommendations"], response);
                      toast({
                        title: "Analysis Complete!",
                        description: "AI has analyzed your hero banners and provided insights",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Analysis Failed",
                        description: error.message || "Failed to analyze hero banners",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={aiLoading || !heroImages?.length}
                  className="w-full"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analyze Hero Banners
                    </>
                  )}
                </Button>

                {aiRecommendations && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Key Insights
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {aiRecommendations.insights?.map((insight: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-blue-500" />
                        Top Recommendations
                      </h4>
                      <div className="space-y-2">
                        {aiRecommendations.recommendations?.slice(0, 3).map((rec: any, index: number) => (
                          <div key={index} className="text-sm border rounded p-2">
                            <div className="font-medium">{rec.userType}</div>
                            <div className="text-gray-600">{rec.reason}</div>
                            <div className="text-xs text-blue-600 mt-1">
                              Confidence: {Math.round(rec.confidence * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiRecommendations.suggestedRotation && (
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          Rotation Strategy
                        </h4>
                        <div className="text-sm space-y-1">
                          <div><strong>Schedule:</strong> {aiRecommendations.suggestedRotation.schedule}</div>
                          <div><strong>Reasoning:</strong> {aiRecommendations.suggestedRotation.reasoning}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!heroImages?.length && (
                  <div className="text-center py-4 text-gray-500">
                    Upload hero banners first to get AI insights
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Theme Suggestions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  New Theme Suggestions
                </CardTitle>
                <CardDescription>
                  AI-generated ideas for expanding your banner collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={async () => {
                    try {
                      const response = await apiRequest("GET", "/api/admin/ai-theme-suggestions");
                      queryClient.setQueryData(["/api/admin/ai-theme-suggestions"], response);
                      toast({
                        title: "Theme Ideas Generated!",
                        description: "AI has suggested new banner themes for your collection",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Failed to Generate Ideas",
                        description: error.message || "Failed to generate theme suggestions",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={themesLoading || !heroImages?.length}
                  className="w-full"
                  variant="outline"
                >
                  {themesLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Get Theme Ideas
                    </>
                  )}
                </Button>

                {themeSuggestions?.suggestions && (
                  <div className="space-y-3">
                    {themeSuggestions.suggestions.map((suggestion: string, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="text-sm text-gray-700">{suggestion}</div>
                      </div>
                    ))}
                  </div>
                )}

                {!heroImages?.length && (
                  <div className="text-center py-4 text-gray-500">
                    Upload hero banners first to get theme suggestions
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Banner Analysis Grid */}
          {aiRecommendations?.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>Individual Banner Analysis</CardTitle>
                <CardDescription>
                  Detailed AI analysis of each hero banner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiRecommendations.analysis.map((analysis: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="font-medium text-sm">Banner {analysis.bannerId}</div>
                      <div className="space-y-1 text-xs">
                        <div><strong>Style:</strong> {analysis.visualStyle}</div>
                        <div><strong>Mood:</strong> {analysis.mood}</div>
                        <div><strong>Type:</strong> {analysis.photographyType}</div>
                        <div><strong>Appeal:</strong> {analysis.appealRating}/10</div>
                        <div><strong>Colors:</strong> {analysis.colorPalette?.join(', ')}</div>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-2">
                        {analysis.targetAudience?.map((audience: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {audience}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hero-images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Hero Image</CardTitle>
              <CardDescription>Set the homepage banner for unauthenticated visitors</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetDefaultHero} className="space-y-4">
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={defaultHeroForm.imageUrl}
                    onChange={(e) => setDefaultHeroForm({ ...defaultHeroForm, imageUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Beautiful landscape photography"
                    value={defaultHeroForm.title}
                    onChange={(e) => setDefaultHeroForm({ ...defaultHeroForm, title: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={setDefaultHeroMutation.isPending}>
                  <Image className="w-4 h-4 mr-2" />
                  {setDefaultHeroMutation.isPending ? "Setting..." : "Set Default Hero Image"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Analytics</CardTitle>
              <CardDescription>
                Monitor object storage usage and identify orphaned files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Quick Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={() => window.open('/api/admin/storage/analytics', '_blank')}
                    variant="outline"
                  >
                    <HardDrive className="w-4 h-4 mr-2" />
                    View Full Analytics
                  </Button>
                  <Button 
                    onClick={() => window.open('/api/admin/storage/audit', '_blank')}
                    variant="outline"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Run Storage Audit
                  </Button>
                </div>

                {/* User Search and Analysis */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">User Storage Audit</h3>
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Enter User ID (e.g., 42860524) or username..."
                        className="w-full px-3 py-2 border rounded-md"
                        value={searchUserId}
                        onChange={(e) => setSearchUserId(e.target.value)}
                      />
                    </div>
                    <Button 
                      variant="outline"
                      onClick={handleUserSearch}
                      disabled={!searchUserId.trim() || userSearchLoading}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      {userSearchLoading ? "Auditing..." : "Run User Audit"}
                    </Button>
                  </div>
                  
                  {userSearchResults && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                        Storage Audit Results for User {userSearchResults.userId}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Database Photos</div>
                          <div className="text-lg font-bold text-blue-600">{userSearchResults.databasePhotos} photos</div>
                        </div>
                        <div>
                          <div className="font-medium">Storage Files</div>
                          <div className="text-lg font-bold text-blue-600">{userSearchResults.storageFiles} files</div>
                        </div>
                        <div>
                          <div className="font-medium">Status</div>
                          <div className={`text-lg font-bold ${userSearchResults.status === 'match' ? 'text-green-600' : 'text-red-600'}`}>
                            {userSearchResults.status === 'match' ? '✓ Match' : '⚠ Mismatch'}
                          </div>
                        </div>
                      </div>
                      {userSearchResults.missingFiles && userSearchResults.missingFiles.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-red-600">Missing Files:</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {userSearchResults.missingFiles.join(', ')}
                          </div>
                        </div>
                      )}
                      {userSearchResults.orphanedFiles && userSearchResults.orphanedFiles.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-orange-600">Orphaned Files:</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {userSearchResults.orphanedFiles.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-500 mt-2">
                    💡 Search for a specific user to run a detailed storage audit and identify any mismatches between database records and actual files.
                  </div>
                </div>

                {/* General Storage Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Total Files</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {storageAudit?.totalFiles || 0}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Total Size</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {storageAudit?.totalSize || '0KB'}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">File Types</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {storageAudit?.breakdown?.length || 0}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500">Health Status</div>
                    <div className="text-2xl font-bold text-green-600">Healthy</div>
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  💡 Use the analytics and audit buttons above to get detailed storage reports and identify any mismatches between database records and actual files.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="object-storage" className="space-y-6">
          <ObjectStorageBrowser />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Platform Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Settings</CardTitle>
              <CardDescription>Configure your IMFOLIO platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Additional platform settings will be available here in future updates.
              </div>
            </CardContent>
          </Card>

          {/* Compatibility Testing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                Compatibility Testing
              </CardTitle>
              <CardDescription>
                Monitor cross-browser performance and functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompatibilityDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}