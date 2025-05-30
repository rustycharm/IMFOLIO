import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";

import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import Account from "@/pages/Account";
import MyPhotos from "@/pages/MyPhotos";
import Portfolio from "@/pages/Portfolio";
import AdminDashboard from "@/pages/AdminDashboard";
import Onboarding from "@/pages/Onboarding";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { useAuth } from "./hooks/useAuth";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/landing" component={Landing} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/my-photos" component={MyPhotos} />
      <Route path="/portfolio/:username" component={Portfolio} />
      <Route path="/:username" component={Portfolio} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-background">
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertTitle>You're offline</AlertTitle>
              <AlertDescription>
                Your internet connection appears to be offline. Some features may not work correctly.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;