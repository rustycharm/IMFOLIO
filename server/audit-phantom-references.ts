
/**
 * Comprehensive audit script to find and report phantom references in the codebase
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos, heroImages, userHeroSelections } from '../shared/schema';

async function auditPhantomReferences() {
  console.log('🔍 COMPREHENSIVE PHANTOM REFERENCE AUDIT');
  console.log('=========================================\n');

  try {
    const client = new Client();

    // 1. Check all photos for broken storage references
    console.log('📸 Auditing photo references...');
    const allPhotos = await db.select().from(photos);
    const brokenPhotoRefs = [];

    for (const photo of allPhotos) {
      if (photo.imageUrl) {
        const key = photo.imageUrl.replace('/images/', '');
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            brokenPhotoRefs.push({
              id: photo.id,
              userId: photo.userId,
              title: photo.title,
              url: photo.imageUrl,
              key: key
            });
          }
        } catch (error) {
          brokenPhotoRefs.push({
            id: photo.id,
            userId: photo.userId,
            title: photo.title,
            url: photo.imageUrl,
            key: key,
            error: error.message
          });
        }
      }
    }

    // 2. Check all hero images for broken storage references
    console.log('🦸 Auditing hero image references...');
    const allHeroImages = await db.select().from(heroImages);
    const brokenHeroRefs = [];

    for (const hero of allHeroImages) {
      if (hero.url || hero.imageUrl) {
        const url = hero.url || hero.imageUrl;
        const possibleKeys = [
          url.replace('/images/', ''),
          url.replace('/images/global/', 'global/'),
          `global/hero-images/${url.split('/').pop()}`
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
          brokenHeroRefs.push({
            id: hero.id,
            name: hero.name,
            url: url,
            possibleKeys: possibleKeys
          });
        }
      }
    }

    // 3. Check user hero selections for broken references
    console.log('👤 Auditing user hero selections...');
    const userSelections = await db.select().from(userHeroSelections);
    const brokenSelections = [];

    for (const selection of userSelections) {
      if (selection.customImageUrl) {
        const key = selection.customImageUrl.replace('/images/', '');
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            brokenSelections.push({
              userId: selection.userId,
              customImageUrl: selection.customImageUrl,
              heroImageId: selection.heroImageId
            });
          }
        } catch (error) {
          brokenSelections.push({
            userId: selection.userId,
            customImageUrl: selection.customImageUrl,
            heroImageId: selection.heroImageId,
            error: error.message
          });
        }
      }
    }

    // Report findings
    console.log('\n📊 AUDIT RESULTS:');
    console.log('================');
    
    console.log(`\n📸 Photos with broken storage references: ${brokenPhotoRefs.length}`);
    if (brokenPhotoRefs.length > 0) {
      brokenPhotoRefs.forEach(photo => {
        console.log(`   - Photo ID ${photo.id} (User: ${photo.userId}): "${photo.title}"`);
        console.log(`     URL: ${photo.url}`);
        console.log(`     Key: ${photo.key}`);
        if (photo.error) console.log(`     Error: ${photo.error}`);
      });
    }

    console.log(`\n🦸 Hero images with broken storage references: ${brokenHeroRefs.length}`);
    if (brokenHeroRefs.length > 0) {
      brokenHeroRefs.forEach(hero => {
        console.log(`   - Hero ID ${hero.id}: "${hero.name}"`);
        console.log(`     URL: ${hero.url}`);
        console.log(`     Tried keys: ${hero.possibleKeys.join(', ')}`);
      });
    }

    console.log(`\n👤 User selections with broken custom images: ${brokenSelections.length}`);
    if (brokenSelections.length > 0) {
      brokenSelections.forEach(selection => {
        console.log(`   - User ${selection.userId}: ${selection.customImageUrl}`);
        if (selection.error) console.log(`     Error: ${selection.error}`);
      });
    }

    const totalIssues = brokenPhotoRefs.length + brokenHeroRefs.length + brokenSelections.length;
    
    if (totalIssues === 0) {
      console.log('\n✅ No phantom references found! All storage references are valid.');
    } else {
      console.log(`\n⚠️ Found ${totalIssues} phantom references that need cleanup.`);
      console.log('\n🔧 Recommended actions:');
      if (brokenPhotoRefs.length > 0) {
        console.log(`   - Run cleanup script for ${brokenPhotoRefs.length} orphaned photos`);
      }
      if (brokenHeroRefs.length > 0) {
        console.log(`   - Fix or remove ${brokenHeroRefs.length} broken hero image references`);
      }
      if (brokenSelections.length > 0) {
        console.log(`   - Reset ${brokenSelections.length} user hero selections with broken custom images`);
      }
    }

    return {
      brokenPhotos: brokenPhotoRefs.length,
      brokenHeroes: brokenHeroRefs.length,
      brokenSelections: brokenSelections.length,
      totalIssues
    };

  } catch (error) {
    console.error('❌ Audit failed:', error);
    throw error;
  }
}

auditPhantomReferences()
  .then((result) => {
    console.log(`\n✅ Audit complete: ${result.totalIssues} total issues found`);
    process.exit(result.totalIssues > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('💥 Audit failed:', error);
    process.exit(1);
  });

export default auditPhantomReferences;
