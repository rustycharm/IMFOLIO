import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkUserPhotosIntegrity(userId: string) {
  console.log(`🔍 CHECKING PHOTO INTEGRITY FOR USER: ${userId}`);
  console.log('='.repeat(60));

  try {
    // Get user's photos from database
    const userPhotos = await db.select().from(photos).where(eq(photos.userId, userId));
    console.log(`📊 Database records: ${userPhotos.length} photos`);

    // Check object storage
    const client = new Client();
    const result = await client.list();
    
    if (!result.ok) {
      throw new Error('Failed to access object storage');
    }

    // Filter files that belong to this user
    const userFiles = result.value.filter((file: any) => {
      const name = file.name || '';
      return name.includes(`/${userId}/`) || name.includes(`photo/${userId}`) || name.startsWith(`${userId}/`);
    });

    console.log(`📁 Object storage files: ${userFiles.length} files`);

    // Check each database photo against actual storage
    console.log('\n🔍 VERIFYING EACH DATABASE RECORD:');
    let validPhotos = 0;
    let phantomRecords = 0;

    for (const photo of userPhotos) {
      const imageUrl = photo.imageUrl;
      if (!imageUrl) {
        console.log(`❌ Photo ID ${photo.id}: No imageUrl in database`);
        phantomRecords++;
        continue;
      }

      // Extract storage key from URL
      const key = imageUrl.replace('/images/', '');
      
      try {
        const exists = await client.exists(key);
        if (exists.ok && exists.value) {
          console.log(`✅ Photo ID ${photo.id}: File exists in storage`);
          validPhotos++;
        } else {
          console.log(`❌ Photo ID ${photo.id}: PHANTOM RECORD - File missing from storage`);
          console.log(`   URL: ${imageUrl}`);
          console.log(`   Key: ${key}`);
          phantomRecords++;
        }
      } catch (error) {
        console.log(`⚠️ Photo ID ${photo.id}: Error checking storage - ${error.message}`);
        phantomRecords++;
      }
    }

    // Summary
    console.log('\n📋 INTEGRITY SUMMARY:');
    console.log(`Valid photos (in both DB and storage): ${validPhotos}`);
    console.log(`Phantom records (DB only, no file): ${phantomRecords}`);
    console.log(`Storage files for user: ${userFiles.length}`);
    
    const integrityPercentage = userPhotos.length > 0 ? (validPhotos / userPhotos.length * 100).toFixed(1) : 'N/A';
    console.log(`Data integrity: ${integrityPercentage}%`);

    if (phantomRecords > 0) {
      console.log('\n🚨 DATA INTEGRITY ISSUE DETECTED:');
      console.log(`${phantomRecords} database records have no corresponding files in object storage`);
      console.log('This indicates failed uploads are creating database entries without actual files');
    }

    return {
      databaseRecords: userPhotos.length,
      storageFiles: userFiles.length,
      validPhotos,
      phantomRecords,
      integrityPercentage: parseFloat(integrityPercentage) || 0
    };

  } catch (error) {
    console.error('❌ Integrity check failed:', error);
    throw error;
  }
}

// Run check for the specific user
checkUserPhotosIntegrity('42860524')
  .then(result => {
    console.log('\n✅ Integrity check completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Integrity check failed:', error);
    process.exit(1);
  });