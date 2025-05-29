import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';

/**
 * Displays statistics about a user's photo collection 
 * including storage usage and quota information
 */
export default function PhotoStats() {
  const { user } = useAuth();

  // Fetch user photo statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['user', 'photo-stats'],
    queryFn: () => apiRequest('/api/photos/stats'),
    refetchOnWindowFocus: false,
  });

  // Fetch storage usage with quota information
  const { data: storageData, isLoading: storageLoading } = useQuery({
    queryKey: ['user', 'storage-usage'],
    queryFn: () => apiRequest('/api/user/storage-usage'),
    refetchOnWindowFocus: false,
  });

  // Format bytes to human-readable size
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date to human-readable format
  const formatDate = (date: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading || storageLoading) {
    return (
      <div className="mt-6 p-6 border rounded-md bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mt-6 p-6 border rounded-md bg-gray-50">
        <p className="text-gray-500">No photo statistics available</p>
      </div>
    );
  }

  // Use storage data from dedicated endpoint with 250MB quota
  const usagePercentage = storageData?.usagePercentage || 0;

  return (
    <div className="mt-6 p-6 border rounded-md bg-gray-50">
      <h4 className="text-lg font-medium mb-3">Photo Collection Stats</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Total Photos</span>
            <span className="text-sm">{stats.totalPhotos || 0}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Albums</span>
            <span className="text-sm">{stats.albums || 0}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Categories</span>
            <span className="text-sm">{stats.categories || 0}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Last Upload</span>
            <span className="text-sm">{formatDate(stats.lastUploadDate)}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Shared Photos</span>
            <span className="text-sm">{stats.sharedPhotos || 0}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Featured Photos</span>
            <span className="text-sm">{stats.featuredPhotos || 0}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Your Storage Usage</span>
            <span className="text-sm">{storageData?.usedFormatted || '0 MB'} / {storageData?.quotaFormatted || '250 MB'}</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {usagePercentage.toFixed(1)}% of your storage quota used
          </p>
        </div>
      </div>
    </div>
  );
}