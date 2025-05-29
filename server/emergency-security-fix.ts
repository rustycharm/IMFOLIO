/**
 * EMERGENCY SECURITY FIX
 * Immediately block all cross-user access and user folder access for hero images
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages, userHeroSelections } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * CRITICAL: Validate that hero image requests only access global folder
 * This prevents the security breach where hero images were in user folders
 */
export async function validateHeroImageAccess(imagePath: string, userId?: string): Promise<boolean> {
  console.log(`🔒 SECURITY CHECK: Validating hero image access for path: ${imagePath}`);
  
  // CRITICAL: Block ALL access to any user folder paths for hero images
  if (imagePath.includes('/hero/') && imagePath.match(/\/hero\/\d+\//)) {
    console.error(`🚫 SECURITY VIOLATION: Attempted access to user hero folder: ${imagePath}`);
    return false;
  }
  
  // CRITICAL: Block any path that contains user IDs in hero context
  if (imagePath.includes('hero') && imagePath.match(/\/\d{8,}\//)) {
    console.error(`🚫 SECURITY VIOLATION: Attempted access to user-specific hero path: ${imagePath}`);
    return false;
  }
  
  // ONLY allow access to global hero images
  if (imagePath.includes('hero') && !imagePath.includes('global/hero-images')) {
    console.error(`🚫 SECURITY VIOLATION: Hero image not in global folder: ${imagePath}`);
    return false;
  }
  
  console.log(`✅ SECURITY PASSED: Hero image access allowed for: ${imagePath}`);
  return true;
}

/**
 * Fix any database references that point to user folders instead of global
 */
export async function fixHeroImageDatabaseReferences(): Promise<void> {
  console.log('🔧 EMERGENCY: Fixing hero image database references...');
  
  try {
    // Get all hero images that might reference user folders
    const problematicHeroImages = await db
      .select()
      .from(heroImages)
      .where(eq(heroImages.url, '%/hero/%'));
    
    console.log(`Found ${problematicHeroImages.length} potentially problematic hero image references`);
    
    // Fix each problematic reference
    for (const heroImage of problematicHeroImages) {
      if (heroImage.url && heroImage.url.includes('/hero/') && heroImage.url.match(/\/hero\/\d+\//)) {
        // Extract filename from user folder path
        const filename = heroImage.url.split('/').pop();
        const newUrl = `/images/global/hero-images/${filename}`;
        
        console.log(`🔧 Fixing hero image ${heroImage.id}: ${heroImage.url} → ${newUrl}`);
        
        await db
          .update(heroImages)
          .set({ 
            url: newUrl,
            updatedAt: new Date()
          })
          .where(eq(heroImages.id, heroImage.id));
      }
    }
    
    // Also fix any user hero selections that might reference user folders
    const problematicSelections = await db
      .select()
      .from(userHeroSelections);
    
    for (const selection of problematicSelections) {
      if (selection.customImageUrl && 
          selection.customImageUrl.includes('/hero/') && 
          selection.customImageUrl.match(/\/hero\/\d+\//)) {
        
        console.log(`🔧 Removing problematic custom hero URL for user ${selection.userId}`);
        
        // Reset to a safe default hero image
        await db
          .update(userHeroSelections)
          .set({
            heroImageId: 'mountain-sunset',
            customImageUrl: null,
            customImageTitle: null,
            updatedAt: new Date()
          })
          .where(eq(userHeroSelections.userId, selection.userId));
      }
    }
    
    console.log('✅ EMERGENCY: Hero image database references fixed');
    
  } catch (error) {
    console.error('❌ EMERGENCY: Failed to fix hero image references:', error);
    throw error;
  }
}

/**
 * Validate and secure all image access
 */
export async function validateImageAccess(imagePath: string, userId?: string): Promise<boolean> {
  // First check hero image specific security
  if (imagePath.includes('hero')) {
    return await validateHeroImageAccess(imagePath, userId);
  }
  
  // For user photos, ensure they can only access their own
  if (imagePath.includes('/user/') || imagePath.includes('/portfolio/')) {
    const pathUserId = imagePath.match(/\/(?:user|portfolio)\/(\d+)\//)?.[1];
    if (pathUserId && pathUserId !== userId) {
      console.error(`🚫 SECURITY VIOLATION: User ${userId} attempted to access user ${pathUserId}'s photos`);
      return false;
    }
  }
  
  return true;
}