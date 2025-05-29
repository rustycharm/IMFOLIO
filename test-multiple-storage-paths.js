import { Client } from '@replit/object-storage';

async function testMultipleStoragePaths() {
  console.log('Testing multiple storage paths for cherry blossom images...');
  
  try {
    const client = new Client();
    
    // Test various possible paths where cherry blossom images might exist
    const possiblePaths = [
      'global/hero-images/cherry-blossoms.jpg',
      'hero-images/cherry-blossoms.jpg',
      'cherry-blossoms.jpg',
      'global/cherry-blossoms.jpg',
      'hero/cherry-blossoms.jpg',
      'images/cherry-blossoms.jpg',
      'global/hero-images/cherry-blossom.jpg',
      'global/hero-images/cherry_blossoms.jpg',
      'global/hero-images/cherry.jpg',
      'global/hero-images/spring-cherry.jpg',
      'global/hero-images/sakura.jpg',
      'cherry-blossoms-v1.jpg',
      'cherry-blossoms-v2.jpg',
      'cherry-blossoms-old.jpg',
      'cherry-blossoms-new.jpg'
    ];
    
    const foundFiles = [];
    
    for (const path of possiblePaths) {
      console.log(`Testing path: ${path}`);
      
      try {
        const exists = await client.exists(path);
        if (exists.ok && exists.value) {
          console.log(`  ✅ EXISTS: ${path}`);
          
          // Download and analyze
          const download = await client.downloadAsBytes(path);
          if (download.ok) {
            const buffer = Buffer.from(download.value[0]);
            const crypto = await import('crypto');
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            
            foundFiles.push({
              path,
              size: buffer.length,
              hash
            });
            
            console.log(`    Size: ${buffer.length} bytes`);
            console.log(`    Hash: ${hash}`);
          }
        } else {
          console.log(`  ❌ Not found: ${path}`);
        }
      } catch (error) {
        console.log(`  ⚠️ Error testing ${path}: ${error.message}`);
      }
    }
    
    console.log(`\nSummary: Found ${foundFiles.length} cherry blossom files`);
    
    if (foundFiles.length > 1) {
      console.log('\nComparing files:');
      for (let i = 0; i < foundFiles.length; i++) {
        for (let j = i + 1; j < foundFiles.length; j++) {
          const file1 = foundFiles[i];
          const file2 = foundFiles[j];
          
          if (file1.hash === file2.hash) {
            console.log(`🔄 SAME CONTENT: ${file1.path} and ${file2.path}`);
          } else {
            console.log(`🆚 DIFFERENT CONTENT: ${file1.path} (${file1.size}b) vs ${file2.path} (${file2.size}b)`);
          }
        }
      }
    }
    
    // Test other hero image patterns
    console.log('\nTesting other hero images for comparison:');
    const otherHeroTests = [
      'global/hero-images/autumn-colors.jpg',
      'global/hero-images/ocean-waves.jpg',
      'global/hero-images/desert-dunes.jpg'
    ];
    
    for (const path of otherHeroTests) {
      const exists = await client.exists(path);
      if (exists.ok && exists.value) {
        const download = await client.downloadAsBytes(path);
        if (download.ok) {
          const buffer = Buffer.from(download.value[0]);
          console.log(`✅ ${path}: ${buffer.length} bytes`);
        }
      } else {
        console.log(`❌ ${path}: not found`);
      }
    }
    
  } catch (error) {
    console.error('Error testing storage paths:', error);
  }
}

testMultipleStoragePaths().then(() => {
  console.log('\nStorage path testing complete');
  process.exit(0);
}).catch(console.error);