import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { 
  TrendingUp, 
  TrendingDown, 
  Upload, 
  Trash2, 
  HardDrive, 
  Activity,
  BarChart3,
  Calendar,
  Clock
} from 'lucide-react';

interface PerformanceData {
  performance: {
    today: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
    thisWeek: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
    thisMonth: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
    ratios: { todayRatio: number; weekRatio: number; monthRatio: number };
  };
  totalUsage: {
    totalBytes: number;
    totalFiles: number;
    formattedSize: string;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getRatioStatus(ratio: number): { color: string; trend: 'up' | 'down' | 'stable'; description: string } {
  if (ratio > 5) return { color: 'text-green-600', trend: 'up', description: 'Rapid Growth' };
  if (ratio > 2) return { color: 'text-blue-600', trend: 'up', description: 'Healthy Growth' };
  if (ratio > 1) return { color: 'text-yellow-600', trend: 'up', description: 'Modest Growth' };
  if (ratio === 1) return { color: 'text-gray-600', trend: 'stable', description: 'Balanced' };
  return { color: 'text-red-600', trend: 'down', description: 'Declining' };
}

export function PerformanceAnalytics() {
  const { data: performanceData, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ['admin', 'storage', 'performance'],
    queryFn: () => apiRequest('/api/admin/storage/performance'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Performance Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading performance data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !performanceData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Performance Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Failed to load performance data. This feature tracks storage activity over time.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { performance, totalUsage } = performanceData;

  return (
    <div className="space-y-6">
      {/* Total Storage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <CardTitle>Total Platform Storage</CardTitle>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {totalUsage.formattedSize}
            </Badge>
          </div>
          <CardDescription>
            {totalUsage.totalFiles} files tracked with authentic size logging
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Today</span>
            </CardTitle>
            <div className="flex items-center space-x-1">
              {getRatioStatus(performance.ratios.todayRatio).trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {getRatioStatus(performance.ratios.todayRatio).trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-xs ${getRatioStatus(performance.ratios.todayRatio).color}`}>
                {getRatioStatus(performance.ratios.todayRatio).description}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Uploads</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.today.uploads}</div>
                  <div className="text-xs text-muted-foreground">
                    +{formatBytes(performance.today.uploadedBytes)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Deletions</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.today.deletions}</div>
                  <div className="text-xs text-muted-foreground">
                    -{formatBytes(performance.today.deletedBytes)}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Change</span>
                <div className="text-right">
                  <div className={`font-semibold ${performance.today.netFiles >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performance.today.netFiles >= 0 ? '+' : ''}{performance.today.netFiles} files
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ratio: {performance.ratios.todayRatio.toFixed(1)}:1
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>This Week</span>
            </CardTitle>
            <div className="flex items-center space-x-1">
              {getRatioStatus(performance.ratios.weekRatio).trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {getRatioStatus(performance.ratios.weekRatio).trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-xs ${getRatioStatus(performance.ratios.weekRatio).color}`}>
                {getRatioStatus(performance.ratios.weekRatio).description}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Uploads</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.thisWeek.uploads}</div>
                  <div className="text-xs text-muted-foreground">
                    +{formatBytes(performance.thisWeek.uploadedBytes)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Deletions</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.thisWeek.deletions}</div>
                  <div className="text-xs text-muted-foreground">
                    -{formatBytes(performance.thisWeek.deletedBytes)}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Change</span>
                <div className="text-right">
                  <div className={`font-semibold ${performance.thisWeek.netFiles >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performance.thisWeek.netFiles >= 0 ? '+' : ''}{performance.thisWeek.netFiles} files
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ratio: {performance.ratios.weekRatio.toFixed(1)}:1
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>This Month</span>
            </CardTitle>
            <div className="flex items-center space-x-1">
              {getRatioStatus(performance.ratios.monthRatio).trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {getRatioStatus(performance.ratios.monthRatio).trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
              <span className={`text-xs ${getRatioStatus(performance.ratios.monthRatio).color}`}>
                {getRatioStatus(performance.ratios.monthRatio).description}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Uploads</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.thisMonth.uploads}</div>
                  <div className="text-xs text-muted-foreground">
                    +{formatBytes(performance.thisMonth.uploadedBytes)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Deletions</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{performance.thisMonth.deletions}</div>
                  <div className="text-xs text-muted-foreground">
                    -{formatBytes(performance.thisMonth.deletedBytes)}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Change</span>
                <div className="text-right">
                  <div className={`font-semibold ${performance.thisMonth.netFiles >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {performance.thisMonth.netFiles >= 0 ? '+' : ''}{performance.thisMonth.netFiles} files
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ratio: {performance.ratios.monthRatio.toFixed(1)}:1
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Velocity Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Storage Velocity Analysis</span>
          </CardTitle>
          <CardDescription>
            Platform growth patterns based on upload/deletion ratios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Monthly Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Monthly Upload Progress</span>
                <span>{performance.thisMonth.uploads} uploads</span>
              </div>
              <Progress 
                value={Math.min((performance.thisMonth.uploads / Math.max(performance.thisMonth.uploads, 50)) * 100, 100)} 
                className="h-3"
              />
            </div>

            {/* Weekly Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly Upload Progress</span>
                <span>{performance.thisWeek.uploads} uploads</span>
              </div>
              <Progress 
                value={Math.min((performance.thisWeek.uploads / Math.max(performance.thisWeek.uploads, 20)) * 100, 100)} 
                className="h-3"
              />
            </div>

            {/* Daily Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Daily Upload Progress</span>
                <span>{performance.today.uploads} uploads</span>
              </div>
              <Progress 
                value={Math.min((performance.today.uploads / Math.max(performance.today.uploads, 5)) * 100, 100)} 
                className="h-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}