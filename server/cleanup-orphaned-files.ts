import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function cleanupOrphanedFiles() {
  const userId = '42860524';
  console.log(`🧹 Starting cleanup for user ${userId}...`);
  
  try {
    const client = new Client();
    
    // Get all files in user's May 2025 folder
    const storageResult = await client.list({ prefix: `photo/${userId}/2025/05/` });
    const storageFiles = storageResult.ok ? storageResult.value : [];
    
    console.log(`Found ${storageFiles.length} files in storage`);
    
    // Get all database records for this user
    const dbPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.userId, userId));
    
    // Create set of valid file paths from database
    const validFilePaths = new Set(
      dbPhotos
        .map(photo => photo.imageUrl?.replace('/images/', ''))
        .filter(Boolean)
    );
    
    console.log(`Found ${validFilePaths.size} valid file references in database`);
    
    // Identify orphaned files
    const orphanedFiles = storageFiles.filter(file => !validFilePaths.has(file.name));
    
    console.log(`\nIdentified ${orphanedFiles.length} orphaned files:`);
    orphanedFiles.forEach(file => {
      console.log(`  - ${file.name}`);
    });
    
    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files to clean up');
      return;
    }
    
    // Confirm before deletion
    console.log(`\n⚠️  About to delete ${orphanedFiles.length} orphaned files`);
    console.log('These files exist in storage but have no corresponding database records');
    
    // Delete orphaned files
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const file of orphanedFiles) {
      try {
        const deleteResult = await client.delete(file.name);
        if (deleteResult.ok) {
          console.log(`✅ Deleted: ${file.name}`);
          deletedCount++;
        } else {
          console.log(`❌ Failed to delete: ${file.name} - ${deleteResult.error}`);
          failedCount++;
        }
      } catch (error) {
        console.log(`❌ Error deleting ${file.name}: ${error.message}`);
        failedCount++;
      }
    }
    
    // Final summary
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`- Files processed: ${orphanedFiles.length}`);
    console.log(`- Successfully deleted: ${deletedCount}`);
    console.log(`- Failed to delete: ${failedCount}`);
    
    // Verify cleanup
    const postCleanupResult = await client.list({ prefix: `photo/${userId}/2025/05/` });
    const remainingFiles = postCleanupResult.ok ? postCleanupResult.value : [];
    
    console.log(`\n🔍 Post-cleanup verification:`);
    console.log(`- Remaining files: ${remainingFiles.length}`);
    console.log(`- Expected files: ${validFilePaths.size}`);
    
    if (remainingFiles.length === validFilePaths.size) {
      console.log('✅ Cleanup successful - all remaining files have database records');
    } else {
      console.log('⚠️  File count mismatch - manual review recommended');
    }
    
    // Calculate new storage efficiency
    const efficiency = remainingFiles.length > 0 ? 
      (validFilePaths.size / remainingFiles.length * 100).toFixed(1) : 100;
    console.log(`- Storage efficiency: ${efficiency}%`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanupOrphanedFiles().catch(console.error);