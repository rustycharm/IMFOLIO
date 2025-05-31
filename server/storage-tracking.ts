
import { storage } from './storage';

/**
 * Storage tracking module with aggregation logic
 * Provides storage usage statistics with proper data formatting
 */

export interface AggregatedStorageUsage {
  totalBytes: number;
  formattedSize: string;
  totalFiles: number;
}

/**
 * Get aggregated storage usage for a user with proper formatting
 */
export async function getUserStorageUsage(userId: string): Promise<AggregatedStorageUsage> {
  try {
    // Get all storage usage records for the user
    const storageRecords = await storage.getUserStorageUsage(userId);
    
    let totalBytes = 0;
    let totalFiles = storageRecords.length;
    
    // Aggregate the storage usage by parsing size strings
    for (const record of storageRecords) {
      const sizeStr = record.compressedSize;
      
      // Parse different size formats (KB, MB, GB, B)
      if (sizeStr.endsWith('KB')) {
        totalBytes += parseFloat(sizeStr.replace('KB', '')) * 1024;
      } else if (sizeStr.endsWith('MB')) {
        totalBytes += parseFloat(sizeStr.replace('MB', '')) * 1024 * 1024;
      } else if (sizeStr.endsWith('GB')) {
        totalBytes += parseFloat(sizeStr.replace('GB', '')) * 1024 * 1024 * 1024;
      } else if (sizeStr.endsWith('B')) {
        totalBytes += parseFloat(sizeStr.replace('B', ''));
      } else if (/^\d+$/.test(sizeStr)) {
        // Handle raw byte values (fallback for legacy data)
        totalBytes += parseInt(sizeStr);
      }
    }
    
    // Format the total size
    const formattedSize = formatBytes(totalBytes);
    
    return {
      totalBytes,
      formattedSize,
      totalFiles
    };
    
  } catch (error) {
    console.error('Error getting user storage usage:', error);
    return {
      totalBytes: 0,
      formattedSize: '0 B',
      totalFiles: 0
    };
  }
}

/**
 * Log file upload for storage tracking
 */
export async function logFileUpload(
  userId: string,
  fileKey: string,
  originalFilename: string | undefined,
  fileSizeBytes: number,
  imageType: 'photo' | 'hero' | 'profile'
): Promise<void> {
  try {
    const formattedSize = formatBytes(fileSizeBytes);
    
    await storage.logStorageUsage({
      userId,
      fileKey,
      originalFilename: originalFilename || 'unknown',
      compressedSize: formattedSize,
      imageType
    });
    
    console.log(`📊 Storage logged: ${imageType} upload for user ${userId} (${formattedSize})`);
  } catch (error) {
    console.error('Error logging storage usage:', error);
    // Don't throw error to avoid breaking upload flow
  }
}

/**
 * Log file deletion for storage tracking
 */
export async function logFileDeletion(fileKey: string): Promise<void> {
  try {
    console.log(`📊 Storage deletion logged: ${fileKey}`);
    // Note: We could add deletion tracking to database if needed
  } catch (error) {
    console.error('Error logging file deletion:', error);
    // Don't throw error to avoid breaking deletion flow
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
