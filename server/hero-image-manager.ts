
import { db } from './db';
import { heroImages } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { Client } from '@replit/object-storage';
import { uploadImage, getPublicUrl } from './objectStorage';
import fetch from 'node-fetch';

// Reliable default hero images
const DEFAULT_HERO_IMAGES = [
  {
    id: 'mountain-sunset',
    name: 'Mountain Sunset',
    description: 'Stunning sunset over mountain peaks',
    isActive: true,
    isDefault: true
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    description: 'Powerful ocean waves with turquoise water',
    isActive: true,
    isDefault: false
  },
  {
    id: 'forest-path',
    name: 'Forest Path',
    description: 'Misty forest path with sunlight streaming through trees',
    isActive: true,
    isDefault: false
  }
];

const client = new Client();

/**
 * Ensures hero images exist and are properly stored in object storage
 */
export async function ensureHeroImages(): Promise<void> {
  console.log('🔍 Checking hero images status...');
  
  try {
    // Get existing hero images
    const existingImages = await db.select().from(heroImages);
    console.log(`Found ${existingImages.length} hero images in database`);
    
    // Check if we need to create default images
    if (existingImages.length === 0) {
      console.log('No hero images found. Creating default set...');
      await createDefaultHeroImages();
      return;
    }
    
    // Check for a default image
    const hasDefault = existingImages.some(img => img.isDefault);
    if (!hasDefault) {
      console.log('No default hero image found. Setting one...');
      await setDefaultHeroImage(existingImages[0].id);
    }
    
    // Ensure all images use object storage (not external URLs)
    const externalUrlImages = existingImages.filter(img => !img.url.includes('storage.replit.com'));
    if (externalUrlImages.length > 0) {
      console.log(`Found ${externalUrlImages.length} images using external URLs. Migrating to object storage...`);
      for (const image of externalUrlImages) {
        await migrateImageToObjectStorage(image);
      }
    }
    
    console.log('✅ Hero images are properly configured and using object storage');
  } catch (error) {
    console.error('Error managing hero images:', error);
    throw error;
  }
}

/**
 * Creates the default set of hero images
 */
async function createDefaultHeroImages(): Promise<void> {
  try {
    for (const imageData of DEFAULT_HERO_IMAGES) {
      // Create a default image file name
      const imageFileName = `default-${imageData.id}.jpg`;
      const imagePath = `assets/default/${imageFileName}`;
      
      // Store image data
      const storageKey = `global/hero-images/${imageData.id}.jpg`;
      
      // Check if we need to download a sample image (first deployment)
      try {
        // Try to use a local file first
        const imageBuffer = await fetch(`https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80`).then(res => 
          res.arrayBuffer()).then(buffer => Buffer.from(buffer));
        
        // Upload to object storage
        await client.uploadFromBytes(storageKey, imageBuffer);
        
        // Get the URL
        const url = getPublicUrl(storageKey);
        
        // Save to database
        await db.insert(heroImages).values({
          ...imageData,
          url,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`✅ Created default hero image: ${imageData.name}`);
      } catch (downloadError) {
        console.error(`Failed to create default image ${imageData.id}:`, downloadError);
      }
    }
  } catch (error) {
    console.error('Error creating default hero images:', error);
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
 * Migrates a hero image from external URL to object storage
 */
async function migrateImageToObjectStorage(image: any): Promise<void> {
  try {
    console.log(`Migrating image ${image.name} (${image.id}) to object storage...`);
    
    // Download the image
    const response = await fetch(image.url, {
      headers: { 'User-Agent': 'IMFOLIO-Migration/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Create storage key
    const fileExtension = contentType.includes('png') ? '.png' : '.jpg';
    const storageKey = `global/hero-images/${image.id}${fileExtension}`;
    
    // Upload to object storage
    await client.uploadFromBytes(storageKey, buffer);
    
    // Generate public URL
    const url = getPublicUrl(storageKey);
    
    // Update database record
    await db.update(heroImages)
      .set({ 
        url, 
        updatedAt: new Date() 
      })
      .where(eq(heroImages.id, image.id));
    
    console.log(`✅ Successfully migrated ${image.name} to object storage`);
  } catch (error) {
    console.error(`Error migrating image ${image.id}:`, error);
    throw error;
  }
}

/**
 * Adds a new hero image directly to object storage
 */
export async function addHeroImage(imageData: any, imageBuffer: Buffer, contentType: string): Promise<void> {
  try {
    // Create storage key with proper file extension
    const fileExtension = contentType.includes('png') ? '.png' : '.jpg';
    const storageKey = `global/hero-images/${imageData.id}${fileExtension}`;
    
    // Upload to object storage
    await client.uploadFromBytes(storageKey, imageBuffer);
    
    // Generate public URL
    const url = getPublicUrl(storageKey);
    
    // Create database record
    await db.insert(heroImages).values({
      ...imageData,
      url,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`✅ Added new hero image: ${imageData.name}`);
  } catch (error) {
    console.error('Error adding hero image:', error);
    throw error;
  }
}

/**
 * Deletes a hero image
 */
export async function deleteHeroImage(imageId: string): Promise<void> {
  try {
    // Get the image to find its storage key
    const image = await db.select().from(heroImages).where(eq(heroImages.id, imageId));
    
    if (image.length === 0) {
      console.log(`Image ${imageId} not found, nothing to delete`);
      return;
    }
    
    // Extract storage key from URL
    const url = image[0].url;
    if (url.includes('storage.replit.com')) {
      // Parse the key from the URL
      const key = url.split('storage.replit.com/')[1];
      
      // Delete from object storage
      try {
        await client.delete(key);
        console.log(`✅ Deleted image from object storage: ${key}`);
      } catch (storageError) {
        console.error(`Error deleting from object storage:`, storageError);
      }
    }
    
    // Delete from database
    await db.delete(heroImages).where(eq(heroImages.id, imageId));
    console.log(`✅ Deleted hero image ${imageId} from database`);
    
    // If we deleted the default image, set a new default
    if (image[0].isDefault) {
      const remainingImages = await db.select().from(heroImages);
      if (remainingImages.length > 0) {
        await setDefaultHeroImage(remainingImages[0].id);
      }
    }
  } catch (error) {
    console.error(`Error deleting hero image:`, error);
    throw error;
  }
}
