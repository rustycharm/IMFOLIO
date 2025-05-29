import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  HardDrive, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Users,
  Database,
  FileImage,
  Activity,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StorageAuditReport {
  databasePhotos: number;
  storageFiles: number;
  orphanedFiles: number;
  orphanedSize: number;
  brokenLinks: string[];
  recommendations: string[];
}

interface UserStorageUsage {
  userId: number;
  username: string;
  totalFiles: number;
  totalSize: number;
  photoCount: number;
  storageQuota: number;
  usagePercentage: number;
}

interface StorageAnalytics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  sizeByType: Record<string, number>;
  largestFiles: { key: string; size: number; type: string }[];
  userBreakdown: { userId: string; size: number; files: number }[];
}

/**
 * Comprehensive Storage Management Component for Admin Dashboard
 * Implements QA recommendations for robust storage monitoring and cleanup
 */
export function StorageManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // User table state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof UserStorageUsage>('usagePercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [usageFilter, setUsageFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch user storage usage data
  const { data: userUsage, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['admin', 'storage', 'usage'],
    queryFn: () => apiRequest('/api/admin/storage/usage'),
    staleTime: 60000, // 1 minute
  });

  // Filtered and sorted user data
  const filteredAndSortedUsers = useMemo(() => {
    if (!userUsage || !Array.isArray(userUsage)) return [];
    
    let filtered = userUsage.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        usageFilter === 'all' ||
        (usageFilter === 'high' && user.usagePercentage >= 70) ||
        (usageFilter === 'medium' && user.usagePercentage >= 30 && user.usagePercentage < 70) ||
        (usageFilter === 'low' && user.usagePercentage < 30);
      
      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [userUsage, searchTerm, sortField, sortDirection, usageFilter]);

  const handleSort = (field: keyof UserStorageUsage) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof UserStorageUsage) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Fetch storage audit report
  const { data: auditReport, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin', 'storage', 'audit'],
    queryFn: () => apiRequest('/api/admin/storage/audit'),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });



  // Fetch storage analytics
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['admin', 'storage', 'analytics'],
    queryFn: () => apiRequest('/api/admin/storage/analytics'),
    staleTime: 30000,
  });

  // Storage cleanup mutation
  const cleanupMutation = useMutation({
    mutationFn: async (options: { removeOrphaned: boolean; fixBrokenLinks: boolean; dryRun: boolean }) => {
      return apiRequest('/api/admin/storage/cleanup', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup Completed",
        description: `Cleaned ${data.orphanedCleaned} orphaned files, fixed ${data.brokenLinksFixed} broken links`,
      });
      // Refresh all data
      refetchAudit();
      refetchUsage();
      refetchAnalytics();
    },
    onError: () => {
      toast({
        title: "Cleanup Failed",
        description: "Failed to execute storage cleanup",
        variant: "destructive"
      });
    }
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatus = (report: StorageAuditReport) => {
    // New approach: Health is based on actual orphaned files and broken links
    // Healthy = no truly orphaned files and no broken database links
    if (report.orphanedFiles === 0 && report.brokenLinks.length === 0) {
      return { status: 'healthy', color: 'green', icon: CheckCircle };
    } else if (report.orphanedFiles <= 5 && report.brokenLinks.length <= 3) {
      return { status: 'warning', color: 'yellow', icon: AlertTriangle };
    } else {
      return { status: 'critical', color: 'red', icon: AlertTriangle };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Storage Management</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor and optimize platform storage usage
          </p>
        </div>
        <Button 
          onClick={() => {
            refetchAudit();
            refetchUsage();
            refetchAnalytics();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Storage Audit</TabsTrigger>
          <TabsTrigger value="users">User Usage</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Photos</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {auditLoading ? '...' : auditReport?.databasePhotos || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Object Storage</CardTitle>
                <FileImage className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsLoading ? '...' : analytics?.totalFiles || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsLoading ? '...' : formatBytes(analytics?.totalSize || 0)}
                </p>
                <p className="text-xs mt-1 text-blue-500 font-medium">Billable Storage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orphaned Files</CardTitle>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {auditLoading ? '...' : auditReport?.orphanedFiles || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {auditLoading ? '...' : formatBytes(auditReport?.orphanedSize || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="text-2xl font-bold">...</div>
                ) : auditReport ? (
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const health = getHealthStatus(auditReport);
                      const Icon = health.icon;
                      return (
                        <>
                          <Icon className={`h-5 w-5 text-${health.color}-500`} />
                          <span className={`text-sm font-medium text-${health.color}-600 capitalize`}>
                            {health.status}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Object Storage Metrics:</strong> These metrics represent actual billable usage from Replit Object Storage. {auditReport?.recommendations?.join('. ')}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Storage Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Audit Report</CardTitle>
              <CardDescription>
                Comprehensive analysis of storage health and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8">Running storage audit...</div>
              ) : auditReport ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Storage Stats</h4>
                      <div className="space-y-1 text-sm">
                        <div>Database Photos: {auditReport.databasePhotos}</div>
                        <div>Storage Files: {auditReport.storageFiles}</div>
                        <div>Orphaned Files: {auditReport.orphanedFiles}</div>
                        <div>Orphaned Size: {formatBytes(auditReport.orphanedSize)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Issues Found</h4>
                      <div className="space-y-1 text-sm">
                        <div>Broken Links: {auditReport.brokenLinks.length}</div>
                        {auditReport.brokenLinks.slice(0, 3).map((link, index) => (
                          <div key={index} className="text-xs text-gray-500 truncate">
                            {link}
                          </div>
                        ))}
                        {auditReport.brokenLinks.length > 3 && (
                          <div className="text-xs text-gray-500">
                            + {auditReport.brokenLinks.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm">
                      {auditReport.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-500">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => cleanupMutation.mutate({
                        removeOrphaned: true,
                        fixBrokenLinks: true,
                        dryRun: true
                      })}
                      variant="outline"
                      disabled={cleanupMutation.isPending}
                    >
                      {cleanupMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      Dry Run Cleanup
                    </Button>
                    <Button
                      onClick={() => cleanupMutation.mutate({
                        removeOrphaned: true,
                        fixBrokenLinks: true,
                        dryRun: false
                      })}
                      variant="destructive"
                      disabled={cleanupMutation.isPending || (auditReport.orphanedFiles === 0 && auditReport.brokenLinks.length === 0)}
                    >
                      {cleanupMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                      Execute Cleanup
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={() => refetchAudit()}>Run Storage Audit</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Usage Tab - Compact Table for Scalability */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Storage Usage</CardTitle>
              <CardDescription>
                Compact view of photographer storage usage - perfect for scaling to many users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="text-center py-8">Loading user storage data...</div>
              ) : userUsage && userUsage.length > 0 ? (
                <div className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search photographers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={usageFilter} onValueChange={setUsageFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by usage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="high">High Usage (70%+)</SelectItem>
                        <SelectItem value="medium">Medium Usage (30-70%)</SelectItem>
                        <SelectItem value="low">Low Usage (&lt;30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compact User Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('username')}>
                            <div className="flex items-center space-x-1">
                              <span>Photographer</span>
                              {getSortIcon('username')}
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort('photoCount')}>
                            <div className="flex items-center justify-end space-x-1">
                              <span>Photos</span>
                              {getSortIcon('photoCount')}
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort('totalSize')}>
                            <div className="flex items-center justify-end space-x-1">
                              <span>Storage Used</span>
                              {getSortIcon('totalSize')}
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer text-right" onClick={() => handleSort('usagePercentage')}>
                            <div className="flex items-center justify-end space-x-1">
                              <span>Usage %</span>
                              {getSortIcon('usagePercentage')}
                            </div>
                          </TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedUsers.map((user) => (
                          <TableRow key={user.userId} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  {user.profileImageUrl ? (
                                    <img 
                                      src={user.profileImageUrl} 
                                      alt="Profile" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-xs font-medium text-gray-500">
                                      {user.username?.[0] || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{user.username}</div>
                                  <div className="text-xs text-muted-foreground">ID: {user.userId}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{user.photoCount}</TableCell>
                            <TableCell className="text-right">
                              <div>
                                <div className="font-medium">{formatBytes(user.totalSize)}</div>
                                <div className="text-xs text-muted-foreground">
                                  of {formatBytes(user.storageQuota)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{user.usagePercentage.toFixed(1)}%</div>
                                <Progress value={user.usagePercentage} className="h-2 w-16 ml-auto" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={
                                  user.usagePercentage >= 90 ? 'destructive' : 
                                  user.usagePercentage >= 70 ? 'secondary' : 
                                  'default'
                                }
                                className="text-xs"
                              >
                                {user.usagePercentage >= 90 ? 'Critical' : 
                                 user.usagePercentage >= 70 ? 'High' : 
                                 user.usagePercentage >= 30 ? 'Normal' : 'Low'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Results Summary */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Showing {filteredAndSortedUsers.length} of {userUsage.length} photographers
                    </span>
                    <span>
                      Total Storage: {formatBytes(userUsage.reduce((sum, user) => sum + user.totalSize, 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">No user storage data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        {/* Content moved to Analytics tab */}

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Analytics</CardTitle>
              <CardDescription>
                Detailed breakdown of object storage usage (Replit billable metrics)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="text-center py-8">Loading analytics...</div>
              ) : analytics ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Total Storage Usage</h3>
                      <div className="text-3xl font-bold mb-1">{formatBytes(analytics.totalSize)}</div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {analytics.totalFiles} files in object storage
                      </p>

                      <h3 className="text-lg font-medium mt-6 mb-2">Largest Files</h3>
                      {analytics.largestFiles && analytics.largestFiles.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-2">
                          {analytics.largestFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between border-b pb-2">
                              <div className="overflow-hidden text-ellipsis max-w-[200px]" title={file.key}>
                                <div className="font-medium">{formatBytes(file.size)}</div>
                                <div className="text-xs text-muted-foreground">{file.key.split('/').pop() || file.key}</div>
                              </div>
                              <Badge variant="outline">{file.type}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No file data available</div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">User Storage Breakdown</h3>
                      {analytics.userBreakdown && analytics.userBreakdown.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-2">
                          {analytics.userBreakdown.map((user, index) => (
                            <div key={index} className="border-b pb-2 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">User {user.userId || 'Unknown'}</div>
                                <Badge>{formatBytes(user.size)}</Badge>
                              </div>
                              <div className="w-full mt-1">
                                <Progress value={(user.size / analytics.totalSize) * 100} className="h-2" />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {user.files} files ({((user.size / analytics.totalSize) * 100).toFixed(1)}% of total)
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No user breakdown available</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Storage Type Breakdown</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(analytics.sizeByType || {}).map(([type, size]) => (
                        <div key={type} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium capitalize">{type}</div>
                            <Badge variant="secondary">{formatBytes(size)}</Badge>
                          </div>
                          <Progress value={(size / analytics.totalSize) * 100} className="h-2" />
                          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                            <span>{analytics.filesByType[type] || 0} files</span>
                            <span>{((size / analytics.totalSize) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      These metrics are pulled directly from Replit Object Storage and represent the actual billable usage.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-8">No analytics data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}