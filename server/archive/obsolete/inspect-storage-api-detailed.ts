import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Detailed inspection of Storage API capabilities
 * This function will analyze what we can retrieve from the Storage API
 */
async function inspectStorageAPICapabilities() {
  console.log('🔍 Inspecting Google Cloud Storage API capabilities...');

  try {
    // Initialize storage with credentials from environment variables
    const storage = new Storage({
      projectId: process.env.OBJECT_STORAGE_PROJECT_ID,
      credentials: {
        client_email: process.env.OBJECT_STORAGE_CLIENT_EMAIL,
        private_key: process.env.OBJECT_STORAGE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }
    });

    const bucketName = process.env.OBJECT_STORAGE_BUCKET_NAME;

    if (!bucketName) {
      throw new Error('Bucket name not defined in environment variables');
    }

    console.log(`📦 Bucket: ${bucketName}`);

    // Get bucket metadata
    console.log('⏳ Fetching bucket metadata...');
    const [metadata] = await storage.bucket(bucketName).getMetadata();
    console.log('📊 Bucket Metadata:', JSON.stringify(metadata, null, 2));

    // List files in bucket with detailed metadata
    console.log('⏳ Listing files with detailed metadata...');
    const [files] = await storage.bucket(bucketName).getFiles();

    console.log(`📁 Found ${files.length} files in bucket`);

    // Get storage usage statistics
    let totalSize = 0;
    let fileTypes = {};

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      totalSize += Number(metadata.size) || 0;

      // Track file types
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[fileExtension] = (fileTypes[fileExtension] || 0) + 1;

      // Show detailed info for first 5 files only to avoid excessive output
      if (files.indexOf(file) < 5) {
        console.log(`📄 File: ${file.name}`);
        console.log(`   Size: ${metadata.size} bytes`);
        console.log(`   Created: ${metadata.timeCreated}`);
        console.log(`   Updated: ${metadata.updated}`);
        console.log(`   Content-Type: ${metadata.contentType}`);
        console.log('---');
      }
    }

    console.log(`📊 Total storage usage: ${totalSize} bytes (${(totalSize / (1024 * 1024)).toFixed(2)} MB)`);
    console.log('📊 File types distribution:', fileTypes);

    // Check if we can get bucket size from API directly
    try {
      console.log('⏳ Checking if direct bucket size retrieval is available...');
      // This operation may not be available depending on the implementation
      const [bucketSizeResponse] = await storage.bucket(bucketName).get();
      console.log('📊 Direct bucket size info:', bucketSizeResponse);
    } catch (error) {
      console.log('❌ Direct bucket size retrieval not available:', error.message);
    }

    // Test IAM permissions to see what operations are allowed
    try {
      console.log('⏳ Testing IAM permissions...');
      const [permissions] = await storage.bucket(bucketName).iam.testPermissions([
        'storage.objects.list',
        'storage.objects.get',
        'storage.objects.create',
        'storage.objects.delete',
        'storage.objects.update',
        'storage.buckets.get',
        'storage.buckets.getIamPolicy',
        'storage.buckets.update'
      ]);

      console.log('🔒 Available permissions:', permissions);
    } catch (error) {
      console.log('❌ Cannot test IAM permissions:', error.message);
    }

    console.log('✅ Storage API inspection complete!');
    return {
      bucketName,
      fileCount: files.length,
      totalSize,
      fileTypes,
      permissions: 'See console output'
    };

  } catch (error) {
    console.error('❌ Error inspecting storage API:', error);
    throw error;
  }
}

// Run the function if script is executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  inspectStorageAPICapabilities().catch(console.error);
}

export { inspectStorageAPICapabilities };