
import { Client } from '@replit/object-storage';
import path from 'path';

/**
 * Comprehensive storage analysis utility that replaces redundant inspection scripts
 * - Provides accurate file count by type
 * - Estimates storage usage based on file counts and types
 * - Produces detailed report of storage organization
 */
export async function checkStorageUsage() {
  try {
    console.log('🔍 Storage Check Utility');
    console.log('========================');
    console.log('Analyzing object storage contents...\n');

    const client = new Client();
    
    // Check if client is accessible
    try {
      const health = await client.health();
      if (!health.ok) {
        throw new Error(`Storage health check failed: ${health.error}`);
      }
      console.log('✅ Storage client connected successfully\n');
    } catch (error) {
      console.error('⚠️ Storage connection error:', error.message);
      return {
        fileCount: 0,
        estimatedSize: 0,
        estimatedSizeFormatted: '0 B',
        error: error.message
      };
    }

    // Get all files
    const result = await client.list();
    if (!result.ok) {
      throw new Error(`Failed to list files: ${result.error}`);
    }

    const files = result.value;
    console.log(`📊 Total files in storage: ${files.length}`);

    // Analyze file types
    const extensionCounts: Record<string, number> = {};
    const directoryCounts: Record<string, number> = {};
    
    // Track file paths for better organization analysis
    files.forEach((file: any) => {
      const key = file.key;
      
      // Count by extension
      const ext = path.extname(key).toLowerCase().replace('.', '') || 'unknown';
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      
      // Count by top-level directory
      const topDir = key.split('/')[0] || 'root';
      directoryCounts[topDir] = (directoryCounts[topDir] || 0) + 1;
    });

    // Print extension counts
    console.log('\n📋 FILES BY TYPE:');
    Object.entries(extensionCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .forEach(([ext, count]) => {
        console.log(`${ext}: ${count} files`);
      });
    
    // Print directory counts
    console.log('\n📁 FILES BY DIRECTORY:');
    Object.entries(directoryCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .forEach(([dir, count]) => {
        console.log(`${dir}: ${count} files`);
      });
    
    // Since we don't have reliable file sizes, we'll estimate based on file types and paths
    let estimatedTotalSize = 0;
    
    // More granular size estimates based on file types
    const typeToEstimatedSize: Record<string, number> = {
      'jpg': 500 * 1024,     // 500KB for JPG
      'jpeg': 500 * 1024,    // 500KB for JPEG
      'png': 750 * 1024,     // 750KB for PNG
      'webp': 300 * 1024,    // 300KB for WebP
      'svg': 50 * 1024,      // 50KB for SVG
      'gif': 1024 * 1024,    // 1MB for GIF
      'pdf': 2 * 1024 * 1024, // 2MB for PDF
      'json': 10 * 1024,     // 10KB for JSON
      'txt': 5 * 1024,       // 5KB for text files
      'unknown': 500 * 1024  // 500KB default
    };
    
    // Path-based size estimates for special cases
    const pathSizeEstimates = [
      { pattern: /hero|global/, size: 400 * 1024 },     // 400KB for hero images
      { pattern: /profile/, size: 200 * 1024 },         // 200KB for profile pictures
      { pattern: /thumbnail/, size: 100 * 1024 },       // 100KB for thumbnails
      { pattern: /photo/, size: 1.2 * 1024 * 1024 }     // 1.2MB for standard photos
    ];
    
    // Process files individually for more accurate estimates
    const filesByCategory: Record<string, { count: number, totalSize: number }> = {};
    
    for (const file of files) {
      const key = (file as any).key || 'unknown';
      const extension = key.split('.').pop()?.toLowerCase() || 'unknown';
      
      // Default size based on extension
      let estimatedSize = typeToEstimatedSize[extension] || typeToEstimatedSize['unknown'];
      
      // Check for special path patterns that would modify the size estimate
      for (const pathEstimate of pathSizeEstimates) {
        if (pathEstimate.pattern.test(key)) {
          estimatedSize = pathEstimate.size;
          break;
        }
      }
      
      // Categorize files for better reporting
      const category = key.split('/')[0] || 'uncategorized';
      if (!filesByCategory[category]) {
        filesByCategory[category] = { count: 0, totalSize: 0 };
      }
      filesByCategory[category].count++;
      filesByCategory[category].totalSize += estimatedSize;
      
      estimatedTotalSize += estimatedSize;
    }
    
    // Helper to format bytes to human-readable format
    function formatBytes(bytes: number): string {
      if (bytes === 0) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
    
    // Calculate estimates by file extension (for backward compatibility)
    console.log('\n📊 ESTIMATED SIZE BY FILE TYPE:');
    Object.entries(extensionCounts).forEach(([ext, count]) => {
      const estimatedSize = typeToEstimatedSize[ext] || typeToEstimatedSize['unknown'];
      const totalForType = estimatedSize * count;
      
      console.log(`${ext}: ${count} files × ~${formatBytes(estimatedSize)} = ~${formatBytes(totalForType)}`);
    });
    
    // Report by category for more insight
    console.log('\n📊 ESTIMATED SIZE BY CATEGORY:');
    Object.entries(filesByCategory)
      .sort((a, b) => b[1].totalSize - a[1].totalSize)
      .forEach(([category, data]) => {
        console.log(`${category}: ${data.count} files = ~${formatBytes(data.totalSize)}`);
      });
    
    console.log('\n📊 ESTIMATED TOTAL STORAGE:');
    console.log(`~${formatBytes(estimatedTotalSize)}`);
    
    // Identify potential cleanup opportunities
    console.log('\n🧹 CLEANUP OPPORTUNITIES:');
    if (extensionCounts['unknown'] && extensionCounts['unknown'] > 5) {
      console.log(`- ${extensionCounts['unknown']} files with unknown extension might need review`);
    }
    
    // Look for potentially orphaned or temporary files
    if (directoryCounts['temp'] || directoryCounts['tmp']) {
      const tempFiles = directoryCounts['temp'] || 0 + directoryCounts['tmp'] || 0;
      console.log(`- ${tempFiles} files in temporary directories could potentially be cleaned up`);
    }
    
    return {
      fileCount: files.length,
      estimatedSize: estimatedTotalSize,
      estimatedSizeFormatted: formatBytes(estimatedTotalSize),
      categories: filesByCategory,
      fileTypes: extensionCounts
    };
  } catch (error) {
    console.error('Storage check failed:', error);
    return {
      fileCount: 0,
      estimatedSize: 0,
      estimatedSizeFormatted: '0 B',
      error: error.message
    };
  }
}

// Execute if run directly
if (import.meta.url.endsWith(process.argv[1])) {
  checkStorageUsage()
    .then(result => {
      console.log('\n== FINAL SUMMARY ==');
      console.log(`📁 Total files: ${result.fileCount}`);
      console.log(`💾 Estimated storage: ${result.estimatedSizeFormatted}`);
    })
    .catch(error => {
      console.error('Failed to check storage:', error);
      process.exit(1);
    });
}
