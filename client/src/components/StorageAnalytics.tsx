import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, FileX, HardDrive, Database } from "lucide-react";

interface StorageAnalyticsProps {
  analytics: {
    totalFiles: number;
    validFiles: number;
    corruptedFiles: number;
    orphanedFiles: number;
    dataIntegrityStatus: string;
    storageHealth: {
      totalSize: string;
      breakdown: Array<{
        imageType: string;
        count: number;
      }>;
      lastAudit: string;
    };
    recommendations: string[];
    diagnostics: {
      objectStorageCount: number;
      databaseRecordCount: number;
      discrepancy: number;
    };
  };
}

export function StorageAnalytics({ analytics }: StorageAnalyticsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case "ORPHANED_FILES_DETECTED":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Cleanup Needed</Badge>;
      case "CRITICAL_ISSUES_DETECTED":
        return <Badge className="bg-red-100 text-red-800 border-red-200"><FileX className="w-3 h-3 mr-1" />Critical Issues</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Storage Health Report
            </CardTitle>
            {getStatusBadge(analytics.dataIntegrityStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* File Statistics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">File Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Files</span>
                  <span className="font-mono text-lg font-bold text-blue-600">{analytics.totalFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valid Files</span>
                  <span className="font-mono text-lg font-bold text-green-600">{analytics.validFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Corrupted Files</span>
                  <span className="font-mono text-lg font-bold text-red-600">{analytics.corruptedFiles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Orphaned Files</span>
                  <span className="font-mono text-lg font-bold text-yellow-600">{analytics.orphanedFiles.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Storage Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Storage Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Size</span>
                  <span className="font-mono text-lg font-bold text-purple-600">{analytics.storageHealth.totalSize}</span>
                </div>
                {analytics.storageHealth.breakdown.map((item) => (
                  <div key={item.imageType} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{item.imageType} Images</span>
                    <span className="font-mono font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Integrity */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">Data Integrity</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    Object Storage
                  </span>
                  <span className="font-mono font-semibold">{analytics.diagnostics.objectStorageCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Database Records
                  </span>
                  <span className="font-mono font-semibold">{analytics.diagnostics.databaseRecordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm text-gray-600">Discrepancy</span>
                  <span className={`font-mono font-bold ${analytics.diagnostics.discrepancy > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {analytics.diagnostics.discrepancy.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">
            <p>Last audit completed: <span className="font-mono">{formatDate(analytics.storageHealth.lastAudit)}</span></p>
            <p className="mt-1">This analysis shows real-time data from your object storage and database</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}