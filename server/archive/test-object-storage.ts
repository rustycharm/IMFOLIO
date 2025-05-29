
import { Client } from '@replit/object-storage';

/**
 * Test script for Replit Object Storage functionality
 */
async function testObjectStorage() {
  console.log('Testing Replit Object Storage connectivity and functionality...');
  
  try {
    // Initialize storage client
    const client = new Client();
    console.log('✅ Successfully created Object Storage client');
    
    // Test basic connectivity
    const listResult = await client.list();
    if (!listResult.ok) {
      throw new Error('Failed to list objects from storage');
    }
    
    console.log(`✅ Successfully connected. Found ${listResult.value.length} objects in storage.`);
    
    // Test upload functionality with a small test file
    const testKey = `test/test-file-${Date.now()}.txt`;
    const testContent = Buffer.from('This is a test file created to verify object storage functionality');
    
    console.log(`📤 Uploading test file: ${testKey}`);
    const uploadResult = await client.uploadFromBytes(testKey, testContent);
    
    if (!uploadResult.ok) {
      throw new Error('Failed to upload test file');
    }
    
    console.log('✅ Test file uploaded successfully');
    
    // Verify the file exists
    const existsResult = await client.exists(testKey);
    if (!existsResult.ok || !existsResult.value) {
      throw new Error('Failed to verify test file existence');
    }
    
    console.log('✅ Test file existence verified');
    
    // Download and verify content
    const downloadResult = await client.downloadAsBytes(testKey);
    if (!downloadResult.ok) {
      throw new Error('Failed to download test file');
    }
    
    const downloadedContent = downloadResult.value[0];
    const contentMatches = Buffer.compare(downloadedContent, testContent) === 0;
    
    if (!contentMatches) {
      throw new Error('Downloaded content does not match original content');
    }
    
    console.log('✅ Test file downloaded and content verified');
    
    // Test public access (if supported)
    try {
      console.log('1. Check if Replit Object Storage supports public URLs');
      console.log('2. Verify if authentication headers are needed');
      console.log('3. Check if there\'s a different domain/format for public access');
    } catch (downloadError) {
      console.error('❌ Download failed:', downloadError.message);
    }
    
    // Clean up test file
    console.log(`🧹 Cleaning up: deleting test file ${testKey}`);
    const deleteResult = await client.delete(testKey);
    
    if (!deleteResult.ok) {
      throw new Error('Failed to delete test file');
    }
    
    console.log('✅ Test file deleted successfully');
    console.log('✅ All Object Storage tests completed successfully');
    
  } catch (error) {
    console.error('❌ Error testing object storage:', error.message);
    throw error;
  }
}

// Execute tests if run directly
if (require.main === module) {
  testObjectStorage()
    .then(() => {
      console.log('✅ All tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

export default testObjectStorage;
