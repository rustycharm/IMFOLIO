
import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages, photos, userHeroSelections } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * CRITICAL SECURITY FIX: Validate user access to storage files
 */

export async function validateUserStorageAccess(userId: string, storageKey: string): Promise<boolean> {
  console.log(`🔒 Validating user ${userId} access to storage key: ${storageKey}`);
  
  // Extract user ID from storage path
  const pathUserIdMatch = storageKey.match(/\/(\d+)\//);
  const pathUserId = pathUserIdMatch ? pathUserIdMatch[1] : null;
  
  // If storage path contains a different user ID, deny access
  if (pathUserId && pathUserId !== userId) {
    console.error(`❌ SECURITY VIOLATION: User ${userId} attempting to access user ${pathUserId}'s files`);
    return false;
  }
  
  // Check if file is legitimately assigned to this user in database
  try {
    // Check user photos
    const userPhotos = await db.select()
      .from(photos)
      .where(and(
        eq(photos.userId, userId),
        eq(photos.imageUrl, `/images/${storageKey}`)
      ));
    
    if (userPhotos.length > 0) {
      return true;
    }
    
    // Check user hero selections
    const userHeroSelections = await db.select()
      .from(userHeroSelections)
      .where(and(
        eq(userHeroSelections.userId, userId),
        eq(userHeroSelections.customImageUrl, `/images/${storageKey}`)
      ));
    
    if (userHeroSelections.length > 0) {
      return true;
    }
    
    // Check if it's a legitimate system hero image (global access)
    if (storageKey.includes('global/hero-images/')) {
      return true;
    }
    
    console.warn(`⚠️ Access denied: File ${storageKey} not owned by user ${userId}`);
    return false;
    
  } catch (error) {
    console.error('Error validating storage access:', error);
    return false; // Deny access on error
  }
}

/**
 * Fix existing cross-user file references
 */
export async function fixCrossUserFileReferences(): Promise<{
  fixed: number;
  errors: string[];
}> {
  console.log('🔧 Starting cross-user file reference cleanup...');
  
  let fixed = 0;
  const errors: string[] = [];
  
  try {
    // Get all user hero selections with potential issues
    const allSelections = await db.select().from(userHeroSelections);
    
    for (const selection of allSelections) {
      if (selection.customImageUrl) {
        // Extract user ID from the URL path
        const urlMatch = selection.customImageUrl.match(/\/hero\/(\d+)\//);
        const urlUserId = urlMatch ? urlMatch[1] : null;
        
        // If URL contains different user ID than selection owner
        if (urlUserId && urlUserId !== selection.userId) {
          console.log(`🔧 Fixing cross-user reference for user ${selection.userId}`);
          
          // Reset to default hero image
          await db.update(userHeroSelections)
            .set({
              heroImageId: 'mountain-sunset',
              customImageUrl: null,
              customImageTitle: null,
              updatedAt: new Date()
            })
            .where(eq(userHeroSelections.userId, selection.userId));
          
          fixed++;
        }
      }
    }
    
    console.log(`✅ Fixed ${fixed} cross-user references`);
    return { fixed, errors };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    console.error('❌ Error fixing cross-user references:', errorMessage);
    return { fixed, errors };
  }
}

// Execute fix immediately
if (require.main === module) {
  fixCrossUserFileReferences()
    .then(result => {
      console.log('Security fix completed:', result);
    })
    .catch(error => {
      console.error('Security fix failed:', error);
    });
}
