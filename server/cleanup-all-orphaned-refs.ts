
import { db } from './db';
import { photos, heroImages } from '../shared/schema';
import { eq, like } from 'drizzle-orm';
import { Client } from '@replit/object-storage';

/**
 * Clean up all 31 orphaned database references found in the diagnostic
 */
async function cleanupAllOrphanedReferences() {
  console.log('🧹 CLEANING UP ALL ORPHANED DATABASE REFERENCES');
  console.log('==============================================\n');

  try {
    const client = new Client();
    let totalCleaned = 0;

    // Get all photos and hero images
    const allPhotos = await db.select().from(photos);
    const allHeroImages = await db.select().from(heroImages);

    console.log(`📊 Checking ${allPhotos.length} photos and ${allHeroImages.length} hero images`);

    // Check photos
    for (const photo of allPhotos) {
      if (photo.imageUrl) {
        const key = photo.imageUrl.replace('/images/', '');
        
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            console.log(`🗑️ Deleting orphaned photo: ID ${photo.id}, URL: ${photo.imageUrl}`);
            await db.delete(photos).where(eq(photos.id, photo.id));
            totalCleaned++;
          }
        } catch (error) {
          console.log(`⚠️ Could not verify photo ${photo.id}, marking as orphaned`);
          await db.delete(photos).where(eq(photos.id, photo.id));
          totalCleaned++;
        }
      }
    }

    // Check hero images
    for (const hero of allHeroImages) {
      if (hero.url) {
        const possibleKeys = [
          hero.url.replace('/images/', ''),
          hero.url.replace('/images/global/', 'global/'),
          `global/hero-images/${hero.url.split('/').pop()}`
        ];

        let exists = false;
        for (const key of possibleKeys) {
          try {
            const result = await client.exists(key);
            if (result.ok && result.value) {
              exists = true;
              break;
            }
          } catch (error) {
            // Continue checking other keys
          }
        }

        if (!exists) {
          console.log(`🗑️ Deleting orphaned hero image: ID ${hero.id}, URL: ${hero.url}`);
          await db.delete(heroImages).where(eq(heroImages.id, hero.id));
          totalCleaned++;
        }
      }
    }

    console.log(`\n🎯 ORPHANED REFERENCES CLEANUP COMPLETE`);
    console.log(`✅ Cleaned up ${totalCleaned} orphaned database references`);
    
    return { success: true, cleaned: totalCleaned };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

cleanupAllOrphanedReferences()
  .then((result) => {
    console.log(`\n✅ Successfully cleaned up ${result.cleaned} orphaned references`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });

export default cleanupAllOrphanedReferences;
