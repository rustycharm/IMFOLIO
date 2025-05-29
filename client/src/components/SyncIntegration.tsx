import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Apple, CheckCircle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { syncPhotosFromService } from '@/lib/photoService';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

// No longer need to pass isLoggedIn as a prop since we use the global auth context
const SyncIntegration = () => {
  // Get authentication state from the global context
  const { isAuthenticated } = useAuth();
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [activeTab, setActiveTab] = useState("apple");
  const { toast } = useToast();
  
  const handleGoogleSync = async () => {
    try {
      setSyncingGoogle(true);
      const result = await syncPhotosFromService('google');
      
      if (result) {
        toast({
          title: "Sync successful",
          description: "Your Google Photos have been synced.",
        });
      }
    } catch (error) {
      console.error('Error syncing with Google Photos:', error);
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "We couldn't sync with Google Photos. Please try again later.",
      });
    } finally {
      setSyncingGoogle(false);
    }
  };

  // If not logged in, show a sign-in prompt instead of the sync options
  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Connect & Sync Photos</CardTitle>
          <CardDescription>
            Create an account or sign in to connect your photo services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 border rounded-md bg-muted/20 text-center space-y-4">
            <h3 className="text-lg font-medium">Sign in to access photo syncing</h3>
            <p className="text-muted-foreground">
              Create a free IMFOLIO account to sync photos from Apple Photos and Google Photos
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
              <Button asChild>
                <a href="/api/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/login">Create Account</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Otherwise, show the full sync UI for logged-in users
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Connect & Sync Photos</CardTitle>
        <CardDescription>
          Connect your photo services to automatically import photos to your IMFOLIO portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="apple">Apple Photos</TabsTrigger>
            <TabsTrigger value="google">Google Photos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="apple" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Apple className="h-8 w-8" />
              <div>
                <h3 className="font-semibold text-lg">Apple Photos</h3>
                <p className="text-sm text-muted-foreground">
                  Import photos from your iCloud Photo Library
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Ready to Connect
              </Badge>
            </div>
            
            <div className="p-4 border rounded-md bg-muted/20">
              <h4 className="font-medium mb-2">Benefits of connecting Apple Photos:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Automatically import your favorite photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Keep your portfolio updated with your latest work</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Select photos by album or tag for easy organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Using IMFOLIO's Apple Developer integration</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                Apple Photos integration is coming soon!
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="google" className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
                <path d="M6 12C6 15.3137 8.68629 18 12 18C14.6124 18 16.8349 16.3304 17.6586 14H12V10H21.8047V14H21.8C20.8734 18.5645 16.8379 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C15.445 2 18.4831 3.742 20.2815 6.39318L17.0039 8.68815C15.9699 7.06812 14.0755 6 12 6C8.68629 6 6 8.68629 6 12Z" fill="currentColor"/>
              </svg>
              <div>
                <h3 className="font-semibold text-lg">Google Photos</h3>
                <p className="text-sm text-muted-foreground">
                  Import photos from your Google Photos account
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Ready to Connect
              </Badge>
            </div>
            
            <div className="p-4 border rounded-md bg-muted/20">
              <h4 className="font-medium mb-2">Benefits of connecting Google Photos:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Access your entire Google Photos library</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Import photos based on Google's smart categorization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Automatically sync new photos as you add them</span>
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        {activeTab === 'apple' ? (
          <Button 
            variant="outline"
            disabled={true}
          >
            Connect Apple Photos (Coming Soon)
          </Button>
        ) : (
          <Button
            onClick={handleGoogleSync}
            disabled={syncingGoogle}
          >
            {syncingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Google Photos
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SyncIntegration;