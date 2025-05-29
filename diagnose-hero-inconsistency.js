import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function diagnoseHeroInconsistency() {
  console.log('🔍 Diagnosing hero image inconsistency between environments...');
  
  try {
    const client = new Client();
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    console.log('\n📊 Database hero images:');
    
    for (const hero of dbHeroImages) {
      console.log(`\n🖼️  ${hero.name} (${hero.id})`);
      console.log(`   Database URL: ${hero.url}`);
      console.log(`   Is Default: ${hero.isDefault}`);
      console.log(`   Added by: ${hero.addedBy || 'System'}`);
      console.log(`   Created: ${hero.createdAt}`);
      
      // Check if file exists in object storage
      const storageKey = hero.url.replace('/images/', '');
      const exists = await client.exists(storageKey);
      
      if (exists.ok && exists.value) {
        console.log(`   ✅ File exists in storage: ${storageKey}`);
        
        // Get file metadata
        try {
          const metadata = await client.downloadAsBytes(storageKey);
          if (metadata.ok) {
            console.log(`   📏 File size: ${metadata.value.length} bytes`);
          }
        } catch (e) {
          console.log(`   ⚠️  Could not get file metadata: ${e.message}`);
        }
      } else {
        console.log(`   ❌ File NOT found in storage: ${storageKey}`);
      }
    }
    
    // Check for any orphaned hero image files in storage
    console.log('\n🔍 Checking for orphaned files in object storage...');
    const objectList = await client.list({ prefix: 'global/hero-images/' });
    
    if (objectList.ok) {
      const storageFiles = objectList.value;
      console.log(`\n📁 Found ${storageFiles.length} files in global/hero-images/`);
      
      for (const file of storageFiles) {
        const fileUrl = `/images/${file.key}`;
        const matchingDb = dbHeroImages.find(hero => hero.url === fileUrl);
        
        if (!matchingDb) {
          console.log(`🏷️  ORPHANED FILE: ${file.key} (not referenced in database)`);
        }
      }
    }
    
    // Look for duplicate file patterns
    console.log('\n🔍 Checking for potential duplicate patterns...');
    
    const allFiles = await client.list();
    if (allFiles.ok) {
      const heroRelatedFiles = allFiles.value.filter(file => 
        file.key?.includes('autumn') || 
        file.key?.includes('ocean') || 
        file.key?.includes('desert') ||
        file.key?.includes('hero')
      );
      
      console.log('\n🌟 Hero-related files found:');
      heroRelatedFiles.forEach(file => {
        console.log(`   ${file.key}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

diagnoseHeroInconsistency().then(() => {
  console.log('\n✅ Diagnosis complete');
  process.exit(0);
}).catch(console.error);