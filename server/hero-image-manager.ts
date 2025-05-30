// DISABLED: External image fetching removed to prevent hero image inconsistencies
// This file has been disabled to lock in the current hero image collection
// All hero images now serve exclusively from object storage

import { db } from './db';
import { heroImages } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Client } from '@replit/object-storage';

const client = new Client();

/**
 * Ensures hero images exist and are properly configured
 * DISABLED: No external fetching - uses existing object storage collection only
 */
export async function ensureHeroImages(): Promise<void> {
  console.log('🔍 Checking hero images status...');
  
  try {
    // Get existing hero images
    const existingImages = await db.select().from(heroImages);
    console.log(`Found ${existingImages.length} hero images in database`);
    
    // Check for a default image
    const hasDefault = existingImages.some(img => img.isDefault);
    if (!hasDefault && existingImages.length > 0) {
      console.log('No default hero image found. Setting first image as default...');
      await setDefaultHeroImage(existingImages[0].id);
    }
    
    console.log('✅ Hero images are properly configured using locked object storage collection');
  } catch (error) {
    console.error('Error managing hero images:', error);
    throw error;
  }
}

/**
 * Sets a specific hero image as the default
 */
async function setDefaultHeroImage(imageId: string): Promise<void> {
  try {
    // First, clear any existing defaults
    await db.update(heroImages)
      .set({ isDefault: false })
      .where(eq(heroImages.isDefault, true));
    
    // Then set the new default
    await db.update(heroImages)
      .set({ isDefault: true })
      .where(eq(heroImages.id, imageId));
    
    console.log(`✅ Set ${imageId} as the default hero image`);
  } catch (error) {
    console.error(`Error setting default hero image:`, error);
    throw error;
  }
}

/**
 * Deletes a hero image from both database and object storage
 */
export async function deleteHeroImage(imageId: string): Promise<void> {
  try {
    // Get the image to find its storage key
    const images = await db.select().from(heroImages).where(eq(heroImages.id, imageId));
    
    if (images.length === 0) {
      throw new Error(`Hero image ${imageId} not found`);
    }
    
    const image = images[0];
    
    // Extract storage key from URL if it exists
    if (image.url) {
      const urlPath = image.url.replace('/images/', '');
      
      // Delete from object storage
      try {
        const exists = await client.exists(urlPath);
        if (exists.ok && exists.value) {
          await client.delete(urlPath);
          console.log(`🗑️ Deleted ${urlPath} from object storage`);
        }
      } catch (storageError) {
        console.warn(`Could not delete from storage: ${storageError}`);
      }
    }
    
    // Delete from database
    await db.delete(heroImages).where(eq(heroImages.id, imageId));
    
    console.log(`✅ Deleted hero image: ${imageId}`);
  } catch (error) {
    console.error('Error deleting hero image:', error);
    throw error;
  }
}