import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Users, Shield, Star } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            IMFOLIO
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
            Professional photography portfolio platform designed to simplify digital asset management through secure authentication.
          </p>
          <Button onClick={handleLogin} size="lg" className="px-8 py-3">
            Sign In to Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <Camera className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Portfolio Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize and showcase your photography work with professional portfolio tools.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Multi-Photographer</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Support for multiple photographers with individual portfolio control and visibility settings.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>Secure Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Reliable authentication system with real email integration for professional use.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <CardTitle>Object Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Robust image handling with object storage for reliable digital asset management.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to showcase your work?</CardTitle>
              <CardDescription>
                Join IMFOLIO and create your professional photography portfolio today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} size="lg" className="w-full">
                Sign In with Replit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}