import { Client } from '@replit/object-storage';

async function exploreStorageStructure() {
  console.log('Exploring actual object storage structure...');
  
  try {
    const client = new Client();
    
    // List all files in storage
    const allFiles = await client.list();
    
    if (!allFiles.ok) {
      console.log('Failed to list files');
      return;
    }
    
    const files = allFiles.value;
    console.log(`Total files in storage: ${files.length}`);
    
    // Group files by directory structure
    const directories = {};
    
    for (const file of files) {
      if (!file.key) continue;
      
      const parts = file.key.split('/');
      const dir = parts.slice(0, -1).join('/') || 'root';
      
      if (!directories[dir]) {
        directories[dir] = [];
      }
      
      directories[dir].push({
        key: file.key,
        size: file.size,
        lastModified: file.lastModified
      });
    }
    
    console.log('\nDirectory structure:');
    for (const [dir, files] of Object.entries(directories)) {
      console.log(`\n📁 ${dir}/ (${files.length} files)`);
      
      // Show first few files in each directory
      const filesToShow = files.slice(0, 5);
      for (const file of filesToShow) {
        console.log(`   ${file.key} (${file.size || 'unknown'} bytes)`);
      }
      
      if (files.length > 5) {
        console.log(`   ... and ${files.length - 5} more files`);
      }
    }
    
    // Specifically look for any hero-related files
    console.log('\nSearching for hero-related files:');
    const heroFiles = files.filter(file => 
      file.key && (
        file.key.toLowerCase().includes('hero') ||
        file.key.toLowerCase().includes('autumn') ||
        file.key.toLowerCase().includes('cherry') ||
        file.key.toLowerCase().includes('ocean') ||
        file.key.toLowerCase().includes('northern')
      )
    );
    
    if (heroFiles.length > 0) {
      console.log(`Found ${heroFiles.length} hero-related files:`);
      for (const file of heroFiles) {
        console.log(`   ${file.key} (${file.size || 'unknown'} bytes)`);
      }
    } else {
      console.log('No hero-related files found');
    }
    
    // Test accessing a specific file that should exist based on earlier successful downloads
    console.log('\nTesting file access:');
    const testKey = 'global/hero-images/cherry-blossoms.jpg';
    console.log(`Testing access to: ${testKey}`);
    
    const exists = await client.exists(testKey);
    console.log(`File exists check: ${exists.ok ? exists.value : 'failed'}`);
    
    if (exists.ok && exists.value) {
      try {
        const download = await client.downloadAsBytes(testKey);
        if (download.ok) {
          const buffer = Buffer.from(download.value[0]);
          console.log(`Successfully downloaded: ${buffer.length} bytes`);
        }
      } catch (error) {
        console.log(`Download failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error exploring storage:', error);
  }
}

exploreStorageStructure().then(() => {
  console.log('\nStorage exploration complete');
  process.exit(0);
}).catch(console.error);