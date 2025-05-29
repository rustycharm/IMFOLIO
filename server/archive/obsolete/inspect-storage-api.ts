import { Client } from '@replit/object-storage';

async function inspectStorageAPI() {
  try {
    const client = new Client();

    console.log('\n🔍 INSPECTING REPLIT OBJECT STORAGE API RESPONSE...\n');

    const result = await client.list();
    console.log('Raw result object:', JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      console.error('❌ Failed to list files:', result.error);
      return;
    }

    console.log('Result.value:', JSON.stringify(result.value, null, 2));
    
    const files = result.value?.objects || result.value || [];
    console.log(`📂 Found ${files.length} files\n`);

    if (files.length > 0) {
      const firstFile = files[0];
      console.log('🔬 DETAILED INSPECTION OF FIRST FILE:');
      console.log('Raw object keys and values:');
      console.log(JSON.stringify(firstFile, null, 2));
      console.log('\n');

      console.log('Object properties:');
      for (const [key, value] of Object.entries(firstFile)) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
      console.log('\n');

      console.log('🔬 ALL FILES SUMMARY:');
      files.forEach((file, index) => {
        console.log(`File ${index + 1}:`);
        console.log(`  Name/Key: ${(file as any).key || (file as any).name || 'unknown'}`);
        
        // Check all possible size properties
        const sizeProps = ['size', 'contentLength', 'content_length', 'fileSize', 'bytes', 'length'];
        sizeProps.forEach(prop => {
          const value = (file as any)[prop];
          if (value !== undefined) {
            console.log(`  ${prop}: ${value} (${typeof value})`);
          }
        });
        
        console.log('  All properties:', Object.keys(file));
        console.log('');
      });
      
      // Try to get file info/metadata for first file
      console.log('\n🔬 TRYING TO GET FILE METADATA...');
      const firstFileName = files[0].name;
      console.log(`Attempting to get metadata for: ${firstFileName}`);
      
      try {
        // Try different methods to get file info
        if (typeof client.head === 'function') {
          console.log('Trying client.head()...');
          const headResult = await client.head(firstFileName);
          console.log('Head result:', JSON.stringify(headResult, null, 2));
        }
        
        if (typeof client.stat === 'function') {
          console.log('Trying client.stat()...');
          const statResult = await client.stat(firstFileName);
          console.log('Stat result:', JSON.stringify(statResult, null, 2));
        }
        
        if (typeof client.info === 'function') {
          console.log('Trying client.info()...');
          const infoResult = await client.info(firstFileName);
          console.log('Info result:', JSON.stringify(infoResult, null, 2));
        }
      } catch (metaError) {
        console.log('Error getting metadata:', metaError);
      }
    }

  } catch (error) {
    console.error('❌ Error inspecting storage API:', error);
  }
}

inspectStorageAPI();