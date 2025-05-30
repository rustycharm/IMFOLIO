/**
 * Download missing hero images from Unsplash and restore them to the global collection
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages } from '../shared/schema';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

interface HeroImageConfig {
  id: string;
  name: string;
  searchQuery: string;
  orientation: 'landscape' | 'portrait';
}

const missingHeroConfigs: HeroImageConfig[] = [
  { id: 'water-ripples', name: 'Water Ripples', searchQuery: 'water ripples lake calm peaceful', orientation: 'landscape' },
  { id: 'shadow-patterns', name: 'Light & Shadow', searchQuery: 'abstract light shadow patterns', orientation: 'landscape' },
  { id: 'cloud-formations', name: 'Cloud Formations', searchQuery: 'dramatic clouds sky formations', orientation: 'landscape' },
  { id: 'vintage-travel', name: 'Vintage Wanderlust', searchQuery: 'vintage travel adventure journey', orientation: 'landscape' },
  { id: 'heritage-building', name: 'Cultural Heritage', searchQuery: 'historic building heritage architecture', orientation: 'landscape' }
];

// DISABLED: External Unsplash downloading removed to prevent hero image inconsistencies
async function downloadImageFromUnsplash(query: string, orientation: string): Promise<Buffer> {
  throw new Error('External hero image downloading is disabled - using locked object storage collection only');
}

  const imageUrl = searchData.results[0].urls.regular;
  
  console.log(`📥 Downloading: ${imageUrl}`);
  
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processAndUploadImage(imageBuffer: Buffer, heroId: string): Promise<string> {
  // Process image with Sharp - resize and optimize for hero banner use
  const processedBuffer = await sharp(imageBuffer)
    .resize(1920, 1080, { 
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ 
      quality: 85,
      progressive: true
    })
    .toBuffer();

  // Upload to object storage
  const client = new Client();
  const key = `global/hero-images/${heroId}.jpg`;
  
  await client.uploadFromBytes(key, processedBuffer);
  
  // Verify upload
  const exists = await client.exists(key);
  if (!exists.ok || !exists.value) {
    throw new Error(`Upload verification failed for ${key}`);
  }

  const url = `/images/${key}`;
  console.log(`✅ Uploaded: ${key} → ${url}`);
  
  return url;
}

async function restoreHeroImages(): Promise<void> {
  console.log('🎨 Starting hero image restoration from Unsplash...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const config of missingHeroConfigs) {
    try {
      console.log(`\n📸 Processing: ${config.name} (${config.id})`);
      console.log(`🔍 Search query: "${config.searchQuery}"`);
      
      // Download from Unsplash
      const imageBuffer = await downloadImageFromUnsplash(config.searchQuery, config.orientation);
      console.log(`📦 Downloaded image (${formatBytes(imageBuffer.length)})`);
      
      // Process and upload
      const imageUrl = await processAndUploadImage(imageBuffer, config.id);
      
      // Update database
      await db.update(heroImages)
        .set({ 
          imageUrl,
          updatedAt: new Date()
        })
        .where(eq(heroImages.id, config.id));
      
      console.log(`✅ Successfully restored: ${config.name}`);
      successCount++;
      
      // Small delay to be respectful to Unsplash API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to restore ${config.name}:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  console.log(`\n🎉 Hero image restoration complete!`);
  console.log(`✅ Successfully restored: ${successCount} images`);
  console.log(`❌ Failed: ${errorCount} images`);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the restoration
restoreHeroImages().catch(console.error);

export { restoreHeroImages };