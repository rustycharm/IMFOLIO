import { db } from './db';
import { storageUsage } from '../shared/schema';
import { eq, sum, desc } from 'drizzle-orm';

/**
 * Log file upload with actual optimized size
 */
export async function logFileUpload(
  userId: number | null,
  fileKey: string,
  fileName: string,
  fileSize: number,
  fileType: 'photo' | 'hero' | 'profile'
): Promise<void> {
  try {
    await db.insert(storageUsage).values({
      userId: userId?.toString() || '0',
      fileKey,
      originalFilename: fileName,
      compressedSize: fileSize.toString(),
      imageType: fileType
    });
    
    console.log(`📊 Storage tracking: +${formatBytes(fileSize)} (${fileName})`);
  } catch (error) {
    console.error('Failed to log file upload:', error);
  }
}

/**
 * Log file deletion
 */
export async function logFileDeletion(
  fileKey: string,
  reason: string = 'user_delete'
): Promise<void> {
  try {
    // Find the original upload record to get the file size
    const uploadRecord = await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.fileKey, fileKey))
      .orderBy(desc(storageUsage.createdAt))
      .limit(1);

    if (uploadRecord.length > 0) {
      const original = uploadRecord[0];
      await db.insert(storageUsage).values({
        userId: original.userId,
        fileKey,
        fileName: original.fileName,
        fileSize: -original.fileSize, // Negative to subtract from total
        fileType: original.fileType,
        operation: 'delete'
      });
      
      console.log(`📊 Storage tracking: -${formatBytes(original.fileSize)} (${original.fileName})`);
    }
  } catch (error) {
    console.error('Failed to log file deletion:', error);
  }
}

/**
 * Get current total storage usage across platform
 */
export async function getTotalStorageUsage(): Promise<{
  totalBytes: number;
  totalFiles: number;
  formattedSize: string;
}> {
  try {
    // Get all records and calculate manually due to schema issues
    const allRecords = await db
      .select()
      .from(storageUsage);

    let totalBytes = 0;
    for (const record of allRecords) {
      const size = parseInt(record.compressedSize || '0', 10);
      if (record.operation === 'upload') {
        totalBytes += size;
      } else if (record.operation === 'delete') {
        totalBytes -= size;
      }
    }
    
    // Count current files (uploads minus deletes)
    const fileCountResult = await db
      .select()
      .from(storageUsage)
      .orderBy(desc(storageUsage.createdAt));

    // Calculate net file count by tracking unique fileKeys
    const fileTracker = new Map<string, boolean>();
    for (const record of fileCountResult) {
      if (record.operation === 'upload') {
        fileTracker.set(record.fileKey, true);
      } else if (record.operation === 'delete') {
        fileTracker.delete(record.fileKey);
      }
    }
    
    const totalFiles = fileTracker.size;

    return {
      totalBytes: Math.max(0, totalBytes), // Ensure non-negative
      totalFiles,
      formattedSize: formatBytes(totalBytes)
    };
  } catch (error) {
    console.error('Failed to get total storage usage:', error);
    return {
      totalBytes: 0,
      totalFiles: 0,
      formattedSize: '0 Bytes'
    };
  }
}

/**
 * Get storage usage by user
 */
export async function getUserStorageUsage(userId: number): Promise<{
  totalBytes: number;
  totalFiles: number;
  formattedSize: string;
}> {
  try {
    // Get user records and calculate manually
    const userRecords = await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.userId, userId.toString()));

    let totalBytes = 0;
    for (const record of userRecords) {
      const size = parseInt(record.compressedSize || '0', 10);
      if (record.operation === 'upload') {
        totalBytes += size;
      } else if (record.operation === 'delete') {
        totalBytes -= size;
      }
    }
    
    // Count user's current files
    const userRecords = await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.userId, userId))
      .orderBy(desc(storageUsage.createdAt));

    const fileTracker = new Map<string, boolean>();
    for (const record of userRecords) {
      if (record.operation === 'upload') {
        fileTracker.set(record.fileKey, true);
      } else if (record.operation === 'delete') {
        fileTracker.delete(record.fileKey);
      }
    }
    
    const totalFiles = fileTracker.size;

    return {
      totalBytes: Math.max(0, totalBytes),
      totalFiles,
      formattedSize: formatBytes(totalBytes)
    };
  } catch (error) {
    console.error('Failed to get user storage usage:', error);
    return {
      totalBytes: 0,
      totalFiles: 0,
      formattedSize: '0 Bytes'
    };
  }
}

/**
 * Format bytes into human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get performance metrics for uploads/deletions over time periods
 */
export async function getPerformanceMetrics(): Promise<{
  today: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
  thisWeek: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
  thisMonth: { uploads: number; deletions: number; netFiles: number; uploadedBytes: number; deletedBytes: number };
  ratios: {
    todayRatio: number; // uploads/deletions ratio
    weekRatio: number;
    monthRatio: number;
  };
}> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get all storage usage records
    const allRecords = await db
      .select()
      .from(storageUsage)
      .orderBy(desc(storageUsage.createdAt));

    const calculateMetrics = (since: Date) => {
      const relevantRecords = allRecords.filter(record => 
        new Date(record.createdAt) >= since
      );

      const uploads = relevantRecords.filter(r => r.operation === 'upload');
      const deletions = relevantRecords.filter(r => r.operation === 'delete');

      return {
        uploads: uploads.length,
        deletions: deletions.length,
        netFiles: uploads.length - deletions.length,
        uploadedBytes: uploads.reduce((sum, r) => sum + r.fileSize, 0),
        deletedBytes: Math.abs(deletions.reduce((sum, r) => sum + r.fileSize, 0))
      };
    };

    const todayMetrics = calculateMetrics(today);
    const weekMetrics = calculateMetrics(weekAgo);
    const monthMetrics = calculateMetrics(monthAgo);

    const calculateRatio = (uploads: number, deletions: number) => 
      deletions === 0 ? uploads : uploads / deletions;

    return {
      today: todayMetrics,
      thisWeek: weekMetrics,
      thisMonth: monthMetrics,
      ratios: {
        todayRatio: calculateRatio(todayMetrics.uploads, todayMetrics.deletions),
        weekRatio: calculateRatio(weekMetrics.uploads, weekMetrics.deletions),
        monthRatio: calculateRatio(monthMetrics.uploads, monthMetrics.deletions)
      }
    };
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return {
      today: { uploads: 0, deletions: 0, netFiles: 0, uploadedBytes: 0, deletedBytes: 0 },
      thisWeek: { uploads: 0, deletions: 0, netFiles: 0, uploadedBytes: 0, deletedBytes: 0 },
      thisMonth: { uploads: 0, deletions: 0, netFiles: 0, uploadedBytes: 0, deletedBytes: 0 },
      ratios: { todayRatio: 0, weekRatio: 0, monthRatio: 0 }
    };
  }
}

/**
 * Get storage usage breakdown by file type
 */
export async function getStorageBreakdown(): Promise<{
  photo: { bytes: number; files: number; formatted: string };
  hero: { bytes: number; files: number; formatted: string };
  profile: { bytes: number; files: number; formatted: string };
}> {
  try {
    const records = await db
      .select()
      .from(storageUsage)
      .orderBy(desc(storageUsage.createdAt));

    const breakdown = {
      photo: { bytes: 0, files: 0, formatted: '0 Bytes' },
      hero: { bytes: 0, files: 0, formatted: '0 Bytes' },
      profile: { bytes: 0, files: 0, formatted: '0 Bytes' }
    };

    const fileTrackers = {
      photo: new Map<string, number>(),
      hero: new Map<string, number>(),
      profile: new Map<string, number>()
    };

    for (const record of records) {
      const type = record.fileType as keyof typeof breakdown;
      if (!breakdown[type]) continue;

      if (record.operation === 'upload') {
        breakdown[type].bytes += record.fileSize;
        fileTrackers[type].set(record.fileKey, record.fileSize);
      } else if (record.operation === 'delete') {
        breakdown[type].bytes -= record.fileSize;
        fileTrackers[type].delete(record.fileKey);
      }
    }

    // Count current files and format sizes
    Object.keys(breakdown).forEach(type => {
      const typedKey = type as keyof typeof breakdown;
      breakdown[typedKey].files = fileTrackers[typedKey].size;
      breakdown[typedKey].bytes = Math.max(0, breakdown[typedKey].bytes);
      breakdown[typedKey].formatted = formatBytes(breakdown[typedKey].bytes);
    });

    return breakdown;
  } catch (error) {
    console.error('Failed to get storage breakdown:', error);
    return {
      photo: { bytes: 0, files: 0, formatted: '0 Bytes' },
      hero: { bytes: 0, files: 0, formatted: '0 Bytes' },
      profile: { bytes: 0, files: 0, formatted: '0 Bytes' }
    };
  }
}