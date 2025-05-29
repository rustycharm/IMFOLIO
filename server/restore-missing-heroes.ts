/**
 * Restore missing hero images to object storage
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages } from '../shared/schema';
import { eq } from 'drizzle-orm';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

interface UnsplashPhoto {
  id: string;
  url: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

async function fetchUnsplashImage(query: string): Promise<UnsplashPhoto> {
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.results.length === 0) {
    throw new Error(`No images found for query: ${query}`);
  }

  const photo = data.results[0];
  return {
    id: photo.id,
    url: photo.urls.regular,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    unsplashUrl: photo.links.html,
  };
}

async function downloadAndStoreImage(imageUrl: string, storageKey: string): Promise<string> {
  console.log(`📥 Downloading: ${imageUrl}`);
  
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
  
  const buffer = Buffer.from(await response.arrayBuffer());
  
  const client = new Client();
  await client.uploadFromBytes(storageKey, buffer);
  
  console.log(`✅ Stored: ${storageKey}`);
  return `/images/${storageKey}`;
}

const heroQueries: Record<string, string> = {
  'urban-skyline': 'urban skyline sunset',
  'modern-building': 'modern architecture minimal',
  'rainy-street': 'street photography rain',
  'water-ripples': 'abstract water ripples',
  'shadow-patterns': 'geometric shadows light',
  'cloud-formations': 'minimalist clouds sky',
  'vintage-travel': 'vintage travel poster',
  'heritage-building': 'cultural architecture heritage',
  'winter-scene': 'winter snow landscape',
  'wheat-field': 'golden wheat field summer',
  'storm-sky': 'dramatic storm landscape'
};

async function restoreMissingHeroImages() {
  console.log('🔧 Starting hero image restoration...');
  
  try {
    const client = new Client();
    
    // Check what files exist
    const objectList = await client.list({ prefix: 'global/hero-images/' });
    const existingFiles = new Set(objectList.objects?.map(obj => obj.key) || []);
    
    console.log(`📁 Found ${existingFiles.size} existing files in object storage`);
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    
    let restored = 0;
    
    for (const heroImage of dbHeroImages) {
      const storageKey = `global/hero-images/${heroImage.id}.jpg`;
      
      if (!existingFiles.has(storageKey)) {
        console.log(`\n🔄 Restoring ${heroImage.name} (${heroImage.id})`);
        
        const query = heroQueries[heroImage.id] || heroImage.name;
        
        try {
          // Fetch from Unsplash
          const photo = await fetchUnsplashImage(query);
          
          // Download and store
          const newUrl = await downloadAndStoreImage(photo.url, storageKey);
          
          // Update database URL
          await db.update(heroImages)
            .set({ 
              url: newUrl,
              updatedAt: new Date()
            })
            .where(eq(heroImages.id, heroImage.id));
          
          console.log(`✅ Restored: ${heroImage.name}`);
          restored++;
          
          // Rate limit delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Failed to restore ${heroImage.id}:`, error);
        }
      } else {
        console.log(`✓ ${heroImage.id} already exists`);
      }
    }
    
    console.log(`\n🎉 Restoration complete! Restored ${restored} hero images.`);
    
  } catch (error) {
    console.error('💥 Restoration failed:', error);
    throw error;
  }
}

// Execute restoration
restoreMissingHeroImages()
  .then(() => {
    console.log('👍 Hero image restoration completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Restoration failed:', error);
    process.exit(1);
  });