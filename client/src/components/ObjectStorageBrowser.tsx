import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Image, File, Download, ExternalLink, Clock, HardDrive, Plus, Trash2 } from "lucide-react";

interface StorageFile {
  key: string;
  size: number | null;
  lastModified: string;
  url: string;
  type: string;
  hasDbEntry: boolean;
  dbInfo?: {
    id: number;
    title: string;
    isPublic: boolean;
    isFeatured: boolean;
  } | null;
}

interface UserStorageData {
  userId: string;
  userPrefix: string;
  totalFiles: number;
  files: StorageFile[];
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export function ObjectStorageBrowser() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users for selection
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/object-storage/users"],
    enabled: true,
  });

  // Fetch storage data for selected user
  const { data: userStorage, isLoading: storageLoading, error: storageError } = useQuery({
    queryKey: [`/api/admin/object-storage/user/${selectedUserId}`],
    enabled: !!selectedUserId,
  }) as { data: UserStorageData | undefined, isLoading: boolean, error: any };

  // Mutation for restoring orphaned files to database
  const restoreFileMutation = useMutation({
    mutationFn: async (fileData: { userId: string; fileKey: string; fileName: string; fileSize: number; fileType: string }) => {
      return apiRequest("/api/admin/object-storage/restore-file", {
        method: "POST",
        body: JSON.stringify(fileData),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "File Restored",
        description: `Successfully added "${variables.fileName}" to database`,
      });
      // Invalidate and refetch user storage data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/object-storage/user/${selectedUserId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore file to database",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting files from object storage
  const deleteFileMutation = useMutation({
    mutationFn: async (fileData: { userId: string; fileKey: string; fileName: string }) => {
      return apiRequest("/api/admin/object-storage/delete-file", {
        method: "DELETE",
        body: JSON.stringify(fileData),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "File Deleted",
        description: `Successfully deleted "${variables.fileName}" from storage`,
      });
      // Invalidate and refetch user storage data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/object-storage/user/${selectedUserId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file from storage",
        variant: "destructive",
      });
    }
  });

  const handleRestoreFile = (file: StorageFile) => {
    const fileName = file.key.split('/').pop() || file.key;
    restoreFileMutation.mutate({
      userId: selectedUserId,
      fileKey: file.key,
      fileName,
      fileSize: file.size || 0,
      fileType: file.type
    });
  };

  const handleDeleteFile = (file: StorageFile) => {
    if (confirm(`Are you sure you want to permanently delete "${file.key.split('/').pop()}" from object storage? This action cannot be undone.`)) {
      const fileName = file.key.split('/').pop() || file.key;
      deleteFileMutation.mutate({
        userId: selectedUserId,
        fileKey: file.key,
        fileName
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const selectedUser = Array.isArray(users) ? users.find((user: User) => user.id === selectedUserId) : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Object Storage Browser
          </CardTitle>
          <CardDescription>
            Browse files directly from object storage, bypassing database records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select User</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user to browse their files" />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <SelectItem value="loading" disabled>Loading users...</SelectItem>
                ) : Array.isArray(users) ? (
                  users.map((user: User) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email}
                        </span>
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
          </div>

          {/* Selected User Info */}
          {selectedUser && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {selectedUser.firstName && selectedUser.lastName 
                      ? `${selectedUser.firstName} ${selectedUser.lastName}` 
                      : selectedUser.email}
                  </h3>
                  <p className="text-sm text-gray-600">User ID: {selectedUser.id}</p>
                  <p className="text-sm text-gray-600">Photo Storage: photo/{selectedUser.id}/</p>
                </div>
                <Badge variant={selectedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                  {selectedUser.role}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Results */}
      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Storage Contents</span>
              {userStorage && (
                <Badge variant="outline">
                  {userStorage.totalFiles} files
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storageLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading storage contents...</p>
              </div>
            ) : storageError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load storage contents</p>
                <p className="text-sm text-gray-500 mt-2">
                  {typeof storageError === 'string' ? storageError : 
                   storageError?.message || 'Unknown error occurred'}
                </p>
              </div>
            ) : userStorage?.files.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No files found in object storage</p>
                <p className="text-sm text-gray-500">This user has no files stored</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{userStorage?.totalFiles}</div>
                    <div className="text-sm text-gray-600">Total Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {userStorage?.files ? formatFileSize(
                        userStorage.files.reduce((total: number, file: StorageFile) => {
                          return total + (typeof file.size === 'number' ? file.size : 0);
                        }, 0)
                      ) : '0 B'}
                    </div>
                    <div className="text-sm text-gray-600">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {userStorage?.files?.filter((f: StorageFile) => f.type.startsWith('image/')).length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Images</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {userStorage?.files?.filter((f: StorageFile) => f.hasDbEntry).length || 0}
                    </div>
                    <div className="text-sm text-gray-600">In Database</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {userStorage?.files?.filter((f: StorageFile) => !f.hasDbEntry).length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Orphaned</div>
                  </div>
                </div>

                {/* File List */}
                <div className="space-y-2">
                  {userStorage?.files?.map((file: StorageFile) => (
                    <div key={file.key} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                      {/* File Icon and Thumbnail */}
                      <div className="flex-shrink-0">
                        {file.type.startsWith('image/') ? (
                          <div className="w-16 h-16 rounded overflow-hidden bg-gray-200">
                            <img 
                              src={file.url} 
                              alt="File thumbnail"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center">
                              {getFileTypeIcon(file.type)}
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center">
                            {getFileTypeIcon(file.type)}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{file.key}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          {typeof file.size === 'number' ? (
                            <span>{formatFileSize(file.size)}</span>
                          ) : (
                            <span className="text-yellow-600">Size calculating...</span>
                          )}
                          {file.lastModified && file.lastModified !== 'Unknown' && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(file.lastModified)}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {file.type}
                          </Badge>
                        </div>
                        
                        {/* Database Status */}
                        <div className="flex items-center gap-2 mt-2">
                          {file.hasDbEntry ? (
                            <>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-xs text-green-600 font-medium">In Database</span>
                              {file.dbInfo && (
                                <span className="text-xs text-gray-500">
                                  ID: {file.dbInfo.id} | {file.dbInfo.isPublic ? 'Public' : 'Private'}
                                  {file.dbInfo.isFeatured ? ' | Featured' : ''}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-600 font-medium">Orphaned File</span>
                              <span className="text-xs text-gray-500">No database entry</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!file.hasDbEntry && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRestoreFile(file)}
                              disabled={restoreFileMutation.isPending}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteFile(file)}
                              disabled={deleteFileMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}