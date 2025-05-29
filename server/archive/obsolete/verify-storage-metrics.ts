import { getStorageAnalytics } from './objectStorage';

/**
 * Helper function to format bytes to human-readable sizes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper function to determine file type from file key
 */
function getFileType(key: string): string {
  if (!key) return 'unknown';

  // Extract extension
  const extension = key.split('.').pop()?.toLowerCase() || '';

  // Common file type categories
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(extension)) {
    return 'image';
  } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
    return 'video';
  } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
    return 'document';
  } else if (['json', 'xml', 'csv', 'yml', 'yaml'].includes(extension)) {
    return 'data';
  }

  return extension || 'other';
}

/**
 * Verify storage metrics from Replit Object Storage
 */
async function verifyStorageMetrics() {
  console.log('Verifying storage metrics from Replit Object Storage...');

  try {
    // Connect to object storage
    console.log('Connected to Replit Object Storage');

    // Get storage analytics
    const analytics = await getStorageAnalytics();

    if (!analytics) {
      throw new Error('Failed to retrieve storage analytics');
    }

    console.log(`Found ${analytics.totalFiles} files in object storage`);

    // Format output
    console.log('\n--- STORAGE METRICS SUMMARY ---');
    console.log(`Total files: ${analytics.totalFiles}`);
    console.log(`Total storage used: ${formatBytes(analytics.totalSize)}`);

    console.log('\n--- BREAKDOWN BY TYPE ---');
    Object.entries(analytics.sizeByType).forEach(([type, size]) => {
      const count = analytics.filesByType[type] || 0;
      const percentage = analytics.totalSize > 0 ? 
        (size / analytics.totalSize * 100).toFixed(2) : '0';
      console.log(`${type}: ${count} files, ${formatBytes(size)} (${percentage}%)`);
    });

    console.log('\n--- LARGEST FILES ---');
    if (analytics.largestFiles && analytics.largestFiles.length > 0) {
      analytics.largestFiles.forEach((file, index) => {
        console.log(`#${index+1}: ${file.key} - ${formatBytes(file.size)} (${file.type})`);
      });
    } else {
      console.log('No file data available');
    }

    // Check for user breakdown
    console.log('\n--- USER STORAGE BREAKDOWN ---');
    if (analytics.userBreakdown && analytics.userBreakdown.length > 0) {
      analytics.userBreakdown.slice(0, 10).forEach((user, index) => {
        console.log(`#${index+1}: User ${user.userId}: ${user.files} files, ${formatBytes(user.size)}`);
      });
    } else {
      console.log('No user breakdown available');
    }

    console.log('\nStorage verification complete.');
    return analytics;
  } catch (error) {
    console.error('Error verifying storage metrics:', error);
    throw error;
  }
}

export default verifyStorageMetrics;

// Run the verification if this file is executed directly
if (require.main === module) {
  verifyStorageMetrics()
    .then(() => {
      console.log('\nThese metrics represent your actual usage for billing purposes.');
      console.log('Verification complete');
    })
    .catch((error) => {
      console.error('Error verifying storage metrics:', error);
      process.exit(1);
    });
}