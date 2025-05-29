import { findOrphanedFiles } from './objectStorage';
import { pool } from './db';

async function checkUserStorage() {
  console.log('🔍 Checking storage for user 42860524...');
  
  try {
    // Check what's in object storage
    const storageResult = await objectStorage.list({ prefix: 'photo/42860524/' });
    
    if (storageResult.success && storageResult.objects) {
      console.log(`📁 Found ${storageResult.objects.length} files in object storage:`);
      storageResult.objects.forEach((obj: any) => {
        console.log(`  📄 ${obj.key} (${obj.size} bytes, modified: ${obj.lastModified})`);
      });
      
      // Get database photos
      const client = await pool.connect();
      try {
        const dbResult = await client.query(
          'SELECT id, title, image_url, created_at FROM photos WHERE user_id = $1 ORDER BY created_at DESC',
          ['42860524']
        );
        
        console.log(`\n📊 Found ${dbResult.rows.length} photos in database:`);
        dbResult.rows.forEach((photo: any) => {
          console.log(`  🖼️  ID ${photo.id}: ${photo.title} - ${photo.image_url}`);
        });
        
        // Extract filenames from database URLs
        const dbFilenames = dbResult.rows.map((photo: any) => {
          const url = photo.image_url;
          const match = url.match(/\/images\/photo\/42860524\/(.+)$/);
          return match ? `photo/42860524/${match[1]}` : null;
        }).filter(Boolean);
        
        console.log('\n🔍 Database files:');
        dbFilenames.forEach(filename => {
          console.log(`  ✓ ${filename}`);
        });
        
        // Check for orphaned files
        const storageKeys = storageResult.objects.map((obj: any) => obj.key);
        const orphanedFiles = storageKeys.filter(key => !dbFilenames.includes(key));
        const missingFiles = dbFilenames.filter(filename => !storageKeys.includes(filename));
        
        if (orphanedFiles.length > 0) {
          console.log('\n⚠️  Orphaned files in storage (not in database):');
          orphanedFiles.forEach(file => {
            console.log(`  🗑️  ${file}`);
          });
        }
        
        if (missingFiles.length > 0) {
          console.log('\n❌ Missing files (in database but not in storage):');
          missingFiles.forEach(file => {
            console.log(`  ❌ ${file}`);
          });
        }
        
        if (orphanedFiles.length === 0 && missingFiles.length === 0) {
          console.log('\n✅ Perfect sync! All database photos have corresponding storage files.');
        }
        
      } finally {
        client.release();
      }
      
    } else {
      console.log('❌ Failed to list objects:', storageResult.error);
    }
    
  } catch (error) {
    console.error('💥 Error checking storage:', error);
  }
}

checkUserStorage().then(() => {
  console.log('🏁 Storage check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});