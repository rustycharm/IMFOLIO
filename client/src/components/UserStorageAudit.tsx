import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, User, HardDrive, Database, FileImage } from "lucide-react";

interface UserStorageAuditProps {
  auditResult: {
    userId: string;
    user: {
      email: string;
      firstName: string;
      lastName: string;
    };
    storage: {
      totalFiles: number;
      estimatedSize: string;
      breakdown: {
        photos: number;
        hero: number;
        profile: number;
        other: number;
      };
    };
    database: {
      photos: number;
      hasProfile: boolean;
      heroSelections: number;
      totalReferences: number;
    };
    integrity: {
      status: string;
      discrepancy: number;
      recommendations: string[];
    };
    lastAudit: string;
  };
}

export function UserStorageAudit({ auditResult }: UserStorageAuditProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PERFECT_MATCH":
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Perfect Match</Badge>;
      case "MINOR_DISCREPANCY":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="w-3 h-3 mr-1" />Minor Issues</Badge>;
      case "SIGNIFICANT_MISMATCH":
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Major Issues</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDisplayName = () => {
    const { firstName, lastName, email } = auditResult.user;
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return email;
  };

  return (
    <div className="space-y-6">
      {/* User Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{getDisplayName()}</CardTitle>
                <p className="text-sm text-gray-600">User ID: {auditResult.userId}</p>
              </div>
            </div>
            {getStatusBadge(auditResult.integrity.status)}
          </div>
        </CardHeader>
      </Card>

      {/* Storage vs Database Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-600" />
              Object Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Files</span>
                <span className="font-mono text-lg font-bold text-purple-600">
                  {auditResult.storage.totalFiles.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Size</span>
                <span className="font-mono font-semibold text-purple-600">
                  {auditResult.storage.estimatedSize}
                </span>
              </div>
              
              {/* File Type Breakdown */}
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">File Types</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Photos</span>
                    <span className="font-mono">{auditResult.storage.breakdown.photos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hero Images</span>
                    <span className="font-mono">{auditResult.storage.breakdown.hero}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profile Images</span>
                    <span className="font-mono">{auditResult.storage.breakdown.profile}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Other Files</span>
                    <span className="font-mono">{auditResult.storage.breakdown.other}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Database Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total References</span>
                <span className="font-mono text-lg font-bold text-blue-600">
                  {auditResult.database.totalReferences.toLocaleString()}
                </span>
              </div>
              
              {/* Database Breakdown */}
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-gray-600 mb-2">Record Types</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Photo Records</span>
                    <span className="font-mono">{auditResult.database.photos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profile Record</span>
                    <span className="font-mono">{auditResult.database.hasProfile ? '1' : '0'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hero Selections</span>
                    <span className="font-mono">{auditResult.database.heroSelections}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-green-600" />
            Integrity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              {getStatusBadge(auditResult.integrity.status)}
            </div>
            
            {auditResult.integrity.discrepancy > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Discrepancy</span>
                <span className="font-mono font-bold text-yellow-600">
                  {auditResult.integrity.discrepancy} files
                </span>
              </div>
            )}

            {/* Recommendations */}
            {auditResult.integrity.recommendations.length > 0 && (
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {auditResult.integrity.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">
            <p>Audit completed: <span className="font-mono">{formatDate(auditResult.lastAudit)}</span></p>
            <p className="mt-1">Results show real-time data from object storage and database</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}