
import { db } from './db';
import { photos } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Clean up phantom database references for any user
 */
async function cleanupPhantomReferences(targetUserId?: string) {
  console.log('🧹 CLEANING UP PHANTOM DATABASE REFERENCES');
  console.log('==========================================\n');

  try {
    const { Client } = await import('@replit/object-storage');
    const client = new Client();

    // Get all photos from database
    const allPhotos = targetUserId 
      ? await db.select().from(photos).where(eq(photos.userId, targetUserId))
      : await db.select().from(photos);

    console.log(`📊 Found ${allPhotos.length} photos to verify${targetUserId ? ` for user ${targetUserId}` : ''}`);

    let phantomCount = 0;

    for (const photo of allPhotos) {
      if (photo.imageUrl) {
        const key = photo.imageUrl.replace('/images/', '');
        
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            console.log(`🗑️ Deleting phantom photo: ID ${photo.id}, URL: ${photo.imageUrl}`);
            await db.delete(photos).where(eq(photos.id, photo.id));
            phantomCount++;
            console.log(`✅ Deleted phantom photo ID ${photo.id}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not verify photo ${photo.id}, marking as phantom`);
          await db.delete(photos).where(eq(photos.id, photo.id));
          phantomCount++;
        }
      }
    }

    console.log('\n🎯 PHANTOM REFERENCES CLEANUP COMPLETE');
    console.log('Any phantom folders should now disappear from your UI');
    
    return { success: true, cleaned: phantomCount };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Allow optional user ID parameter from command line
const targetUserId = process.argv[2];

cleanupPhantomReferences(targetUserId)
  .then((result) => {
    console.log(`\n✅ Successfully cleaned up ${result.cleaned} phantom references`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });

export default cleanupPhantomReferences;
