import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, User, Palette } from "lucide-react";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    tagline: "",
    bio: ""
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/profile/complete", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Refresh user data
      queryClient.invalidateQueries(["/api/auth/user"]);
      
      toast({
        title: "Welcome to IMFOLIO!",
        description: "Your profile has been created successfully.",
      });
      
      // Redirect to home page
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Profile completion failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your first name, last name, and username",
        variant: "destructive",
      });
      return;
    }

    // Username validation (alphanumeric + hyphens/underscores only)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast({
        title: "Invalid username",
        description: "Username can only contain letters, numbers, hyphens, and underscores",
        variant: "destructive",
      });
      return;
    }

    completeProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to IMFOLIO</CardTitle>
          <CardDescription className="text-lg">
            Let's set up your photography portfolio in just a few steps
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Your first name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Your last name"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Portfolio Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  placeholder="Choose a unique username for your portfolio URL"
                  required
                />
                <p className="text-sm text-gray-500">
                  Your portfolio will be available at: imfolio.com/portfolio/{formData.username || "username"}
                </p>
              </div>
            </div>

            {/* Portfolio Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Portfolio Details</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tagline">Portfolio Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange("tagline", e.target.value)}
                  placeholder="e.g., Capturing life's precious moments"
                />
                <p className="text-sm text-gray-500">
                  A short phrase that describes your photography style (optional)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">About You</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Tell visitors about your photography journey, experience, and what makes your work unique..."
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Share your story with potential clients (optional)
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                className="flex-1"
                disabled={completeProfileMutation.isPending}
              >
                {completeProfileMutation.isPending ? "Creating Your Portfolio..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}