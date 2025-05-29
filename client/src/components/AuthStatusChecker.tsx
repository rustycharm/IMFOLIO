
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AuthStatusChecker() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        toast({
          title: data.authenticated ? "You are logged in" : "You are logged out",
          description: `Authentication status checked at ${new Date().toLocaleTimeString()}`,
        });
      } else {
        toast({
          title: "Error checking status",
          description: "Could not retrieve authentication status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Status check error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Authentication Status</CardTitle>
        <CardDescription>
          Check if you're currently logged in or out
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkStatus} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Checking..." : "Check Login Status"}
        </Button>
        
        {status && (
          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
            <p className="font-medium text-lg">
              {status.authenticated ? "✅ You are logged in" : "❌ You are logged out"}
            </p>
            {status.user && (
              <p className="mt-2">Logged in as: {status.user.name} (ID: {status.user.id})</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Last checked: {new Date(status.timestamp).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
