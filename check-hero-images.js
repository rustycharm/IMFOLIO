import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function checkHeroImages() {
  console.log('🔍 Checking hero images in object storage...');
  
  try {
    const client = new Client();
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    console.log(`\n📊 Found ${dbHeroImages.length} hero images in database`);
    
    // List all files in hero images directory
    const objectList = await client.list({ prefix: 'global/hero-images/' });
    
    if (objectList.ok) {
      const storageFiles = objectList.value;
      console.log(`\n📁 Found ${storageFiles.length} files in object storage`);
      
      for (const hero of dbHeroImages) {
        const storageKey = hero.url.replace('/images/', '');
        console.log(`\n🖼️  ${hero.name} (${hero.id})`);
        console.log(`   Database URL: ${hero.url}`);
        console.log(`   Storage Key: ${storageKey}`);
        
        // Check if file exists
        const exists = await client.exists(storageKey);
        if (exists.ok && exists.value) {
          console.log(`   ✅ File exists in storage`);
          
          // Find the file in the list to get actual metadata
          const fileInfo = storageFiles.find(f => f.key === storageKey);
          if (fileInfo) {
            console.log(`   📏 File size: ${fileInfo.size || 'unknown'} bytes`);
            console.log(`   📅 Last modified: ${fileInfo.lastModified || 'unknown'}`);
          }
        } else {
          console.log(`   ❌ File NOT found in storage`);
        }
      }
      
      // Check for any files not referenced in database
      console.log('\n🔍 Checking for unreferenced files...');
      const dbUrls = dbHeroImages.map(h => h.url.replace('/images/', ''));
      
      for (const file of storageFiles) {
        if (!dbUrls.includes(file.key)) {
          console.log(`🏷️  Unreferenced file: ${file.key} (${file.size || 'unknown'} bytes)`);
        }
      }
    } else {
      console.log('❌ Failed to list files in object storage');
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

checkHeroImages().then(() => {
  console.log('\n✅ Check complete');
  process.exit(0);
}).catch(console.error);