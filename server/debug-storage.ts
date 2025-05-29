import { Client } from '@replit/object-storage';

async function debugStorageFiles() {
  try {
    console.log('🔍 DEBUG: Analyzing object storage files...');
    const client = new Client();
    
    const result = await client.list();
    if (!result.ok) {
      console.error('❌ Failed to list objects:', result.error);
      return;
    }
    
    const files = result.value;
    console.log(`📊 Found ${files.length} files in storage`);
    
    let totalSize = 0;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n🔍 File ${i + 1}:`);
      console.log('  Raw file object:', JSON.stringify(file, null, 2));
      
      // Try different ways to access size
      const key = (file as any).key || 'unknown';
      const size1 = (file as any).size;
      const size2 = (file as any).contentLength;
      const size3 = (file as any).Content?.Length;
      const size4 = file.size;
      
      console.log(`  Key: ${key}`);
      console.log(`  size property: ${size1}`);
      console.log(`  contentLength property: ${size2}`);
      console.log(`  Content.Length property: ${size3}`);
      console.log(`  direct size: ${size4}`);
      
      const actualSize = size1 || size2 || size3 || size4 || 0;
      totalSize += actualSize;
      console.log(`  ✅ Using size: ${actualSize} bytes`);
    }
    
    console.log(`\n📊 TOTAL STORAGE: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    
    return { totalFiles: files.length, totalSize };
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Export for use in routes
export { debugStorageFiles };