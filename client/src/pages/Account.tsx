import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Background images will be handled through the hero image system
import SyncIntegration from "@/components/SyncIntegration";
import ProfileEditForm from "@/components/ProfileEditForm";
import PhotoStats from "@/components/PhotoStats";
import HeroImageManager from "@/components/HeroImageManager";
import ProfilePictureManager from "@/components/ProfilePictureManager";
import { useAuth } from "@/hooks/useAuth";
import { generatePortfolioUrl } from "@/lib/utils";


export default function Account() {
  const [isEditing, setIsEditing] = useState(false);
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("photos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    firstName: "",
    lastName: "",
    tagline: "",
    bio: "",
    portfolioUrlType: "username"
  });

  // Get current user data from global auth context
  const { isLoading, isAuthenticated, logout, refreshAuth } = useAuth();

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🔥 CLIENT: Mutation triggered with data:', data);

      // Create proper payload with all profile fields
      // Note: The API expects a flat structure, not nested profile
      const payload = {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        tagline: data.tagline,
        bio: data.bio,
        portfolioUrlType: data.portfolioUrlType
      };

      console.log('🔥 CLIENT: Formatted payload being sent:', payload);
      console.log('🔥 CLIENT: portfolioUrlType specifically:', data.portfolioUrlType, typeof data.portfolioUrlType);

      try {
        console.log('🔥 CLIENT: About to make API request to /api/profile');
        const result = await apiRequest("/api/profile", {
          method: "PUT",
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('🔥 CLIENT: API response received:', result);
        return result;
      } catch (error) {
        console.error('🔥 CLIENT: API request failed:', error);
        console.error('🔥 CLIENT: Error details:', error.message);
        throw error;
      }
    },
    onSuccess: async (response) => {
      console.log('Update response received:', response);

      // Force refresh user data to get the latest profile information
      await refreshAuth();

      // Clear cache and force a full refresh to ensure we have the latest data
      queryClient.invalidateQueries(["/api/auth/user"]);

      // Notify other tabs about the authentication change
      localStorage.setItem('auth_state_changed', Date.now().toString());

      console.log('Profile updated successfully');

      // Show success message
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });

      // If portfolio URL type was changed, provide navigation option
      if (response.portfolioUrlType && response.portfolioUrlType !== 'username') {
        let newUrl = '';
        if (response.portfolioUrlType === 'fullname_dash') {
          newUrl = `/${response.firstName?.toLowerCase()}-${response.lastName?.toLowerCase()}`;
        } else if (response.portfolioUrlType === 'fullname_dot') {
          newUrl = `/${response.firstName?.toLowerCase()}.${response.lastName?.toLowerCase()}`;
        } else if (response.portfolioUrlType === 'replit_id') {
          newUrl = `/${(user as any)?.id}`; // Use actual user Replit ID
        }
        
        if (newUrl) {
          toast({
            title: "Portfolio URL updated!",
            description: `Your portfolio is now available at: ${newUrl}`,
            action: (
              <button 
                onClick={() => setLocation(newUrl)} 
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Visit New URL
              </button>
            ),
          });
        }
      }

      // Exit edit mode
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile information.",
        variant: "destructive",
      });
    }
  });

  // Initialize form data with user data when available
  useEffect(() => {
    if (user) {
      console.log('Loading user data into form:', user);
      setFormData({
        username: (user as any).username || "",
        firstName: (user as any).firstName || "",
        lastName: (user as any).lastName || "",
        tagline: (user as any).profile?.tagline || "",
        bio: (user as any).profile?.bio || "",
        portfolioUrlType: (user as any).profile?.portfolioUrlType || "username"
      });
    }
  }, [user]);

  // Handle logout
  const logoutMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      // Use global logout to ensure consistency
      logout();

      toast({
        title: "Logged out successfully",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // If not authenticated, redirect to home
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to access your account",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation, toast]);

  // Memoize the logout handler
  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-16 px-4">
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
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
                className="text-lg sm:text-xl font-light text-black uppercase tracking-wider hover:text-gray-600 transition-colors"
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
                
                {(user as any)?.role === 'admin' && (
                  <Link 
                    href="/admin/dashboard"
                    className="block py-4 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Admin Dashboard
                    </span>
                  </Link>
                )}
                
                <Link 
                  href={(() => {
                    const urlType = (user as any).profile?.portfolioUrlType;
                    const username = (user as any).username;
                    const firstName = (user as any).firstName;
                    const lastName = (user as any).lastName;
                    const userId = (user as any).id;
                    
                    switch (urlType) {
                      case 'username':
                        return `/${username || userId}`;
                      case 'fullname_dash':
                        return `/${firstName?.toLowerCase()}-${lastName?.toLowerCase()}`;
                      case 'fullname_dot':
                        return `/${firstName?.toLowerCase()}.${lastName?.toLowerCase()}`;
                      case 'replit_id':
                        return `/${userId}`;
                      default:
                        return `/${username || userId}`;
                    }
                  })()}
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
      
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="flex flex-col justify-start items-start">
            <div>
              <h1 className="text-3xl font-light text-black">My Account</h1>
              <p className="text-black font-light">Welcome back, {(user as any)?.firstName || (user as any)?.email}</p>
            </div>
          </div>

        {user && (
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl sm:text-2xl font-bold text-gray-600 overflow-hidden">
              {(user as any).profileImageUrl ? (
                <img 
                  src={(user as any).profileImageUrl} 
                  alt="Profile picture"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                (user as any).firstName ? (user as any).firstName[0] : (user as any).username?.[0] || (user as any).id?.[0] || "U"
              )}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold">
                {(user as any).firstName && (user as any).lastName
                  ? `${(user as any).firstName} ${(user as any).lastName}`
                  : (user as any).username || (user as any).id || "User"}
              </h2>
              <p className="text-sm text-gray-500">{(user as any).emailPartial || "Email on file (private)"}</p>
              <p className="text-xs text-gray-400 mt-1">
                Account type: <span className="capitalize">{(user as any).role || "user"}</span>
              </p>
              <p className="text-xs text-gray-400">
                User ID: <span className="font-mono">{(user as any).id}</span>
              </p>
            </div>
          </div>
        )}

        {/* Profile Summary Section - Always Visible */}
        {user && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Profile Summary</h3>
              <button
                onClick={() => {
                  // Invalidate queries to refresh data from database
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                }}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Username</p>
                <p className="text-base font-mono">{(user as any).username || "Not set"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 font-medium">First Name</p>
                <p className="text-base">{(user as any).firstName || "Not set"}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 font-medium">Last Name</p>
                <p className="text-base">{(user as any).lastName || "Not set"}</p>
              </div>
              

            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 font-medium mb-2">Portfolio URL</p>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                <p className="flex-1 break-all font-mono text-sm">
                  {(() => {
                    // Access nested profile data correctly
                    const urlType = (user as any).profile?.portfolioUrlType || (user as any).portfolioUrlType;
                    const username = (user as any).profile?.username || (user as any).username;
                    const firstName = (user as any).profile?.firstName || (user as any).firstName;
                    const lastName = (user as any).profile?.lastName || (user as any).lastName;
                    const userId = (user as any).id;
                    
                    console.log('✅ FIXED: Now accessing portfolioUrlType correctly');
                    console.log('🔍 URL Generation Debug:', { urlType, firstName, lastName, username, userId });
                    console.log('🔍 Checking if firstName and lastName exist:', { firstNameExists: !!firstName, lastNameExists: !!lastName });
                    
                    let path = '';
                    switch (urlType) {
                      case 'username':
                        path = `/${username}`;
                        break;
                      case 'fullname_dash':
                        if (firstName && lastName) {
                          path = `/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
                        }
                        break;
                      case 'fullname_dot':
                        if (firstName && lastName) {
                          path = `/${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
                        }
                        break;
                      case 'replit_id':
                        path = `/${userId}`;
                        break;
                    }
                    
                    console.log('🎯 Generated path:', path);
                    return `${window.location.origin}${path}`;
                  })()}
                </p>
                <button
                  onClick={() => {
                    const urlType = (user as any).portfolioUrlType;
                    const username = (user as any).username;
                    const firstName = (user as any).firstName;
                    const lastName = (user as any).lastName;
                    const userId = (user as any).id;
                    
                    let path = '';
                    switch (urlType) {
                      case 'username':
                        path = `/${username}`;
                        break;
                      case 'fullname_dash':
                        path = `/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
                        break;
                      case 'fullname_dot':
                        path = `/${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
                        break;
                      case 'replit_id':
                        path = `/${userId}`;
                        break;
                    }
                    
                    const fullUrl = `${window.location.origin}${path}`;
                    navigator.clipboard.writeText(fullUrl);
                    toast({
                      title: "Copied!",
                      description: "Portfolio URL copied to clipboard",
                    });
                  }}
                  className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                  title="Copy portfolio URL"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="photos" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full overflow-x-auto flex md:grid md:grid-cols-5 gap-2 md:gap-0 p-1">
            <TabsTrigger value="photos" className="whitespace-nowrap flex-shrink-0">My Photos</TabsTrigger>
            <TabsTrigger value="profile" className="whitespace-nowrap flex-shrink-0">Edit Profile</TabsTrigger>
            <TabsTrigger value="hero" className="whitespace-nowrap flex-shrink-0">Hero Image</TabsTrigger>
            <TabsTrigger value="avatar" className="whitespace-nowrap flex-shrink-0">Profile Picture</TabsTrigger>
            <TabsTrigger value="settings" className="whitespace-nowrap flex-shrink-0">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="p-4 border rounded-md mt-4">
            <ProfileEditForm 
              formData={formData}
              setFormData={setFormData}
              onSave={() => {
                updateProfileMutation.mutate(formData, {
                  onSuccess: () => {
                    // Add a small delay to ensure database update is complete
                    setTimeout(() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                    }, 500);
                  }
                });
              }}
              onCancel={() => {
                // Reset form data to original values when canceling
                if (user) {
                  setFormData({
                    username: (user as any).username || "",
                    firstName: (user as any).firstName || "",
                    lastName: (user as any).lastName || "",
                    tagline: (user as any).profile?.tagline || "",
                    bio: (user as any).profile?.bio || "",
                    portfolioUrlType: (user as any).profile?.portfolioUrlType || "username"
                  });
                }
              }}
              isPending={updateProfileMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="hero" className="p-4 border rounded-md mt-4">
            <HeroImageManager />
          </TabsContent>

          <TabsContent value="avatar" className="p-4 border rounded-md mt-4">
            <ProfilePictureManager />
          </TabsContent>

          <TabsContent value="photos" className="p-4 border rounded-md mt-4">
            <h3 className="text-xl font-semibold mb-4">My Photo Collection</h3>
            <p className="text-gray-500">Manage your photo collection, organize albums, and sync with photo services.</p>

            {/* Dynamic photo stats */}
            <PhotoStats />

            <div className="mt-6 mb-8 flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Link href="/my-photos" className="w-full sm:w-auto">
                <Button className="w-full">Manage Photos</Button>
              </Link>
              <Link href="/my-photos?upload=true" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">Upload Photos</Button>
              </Link>
            </div>

            <div className="mt-8 pt-8 border-t">
              <h4 className="text-lg font-medium mb-6">Connect Photo Services</h4>
              <SyncIntegration />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="p-4 border rounded-md mt-4">
            <h3 className="text-xl font-semibold mb-4">Account Settings</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Password</h4>
                <p className="text-sm text-gray-500 mb-2">Change your account password</p>
                <Button>Change Password</Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Connected Services</h4>
                <p className="text-sm text-gray-500 mb-2">Manage connections to external photo services</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Apple Photos</p>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Google Photos</p>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                    <Button variant="outline">Connect</Button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Account Management</h4>
                <p className="text-sm text-gray-500 mb-2">Manage your account status</p>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}