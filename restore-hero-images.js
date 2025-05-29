import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import sharp from 'sharp';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Hero image search terms for authentic photos
const HERO_SEARCH_TERMS = {
  'northern-lights': 'aurora borealis northern lights',
  'forest-path': 'forest path sunlight trees',
  'cherry-blossoms': 'cherry blossoms pink flowers spring',
  'ocean-waves': 'ocean waves turquoise water',
  'autumn-colors': 'autumn foliage red orange leaves',
  'winter-scene': 'winter snow landscape',
  'shadow-patterns': 'light shadow geometric patterns',
  'vintage-travel': 'vintage travel photography aesthetic',
  'desert-dunes': 'desert sand dunes golden',
  'heritage-building': 'historic architecture cultural landmarks',
  'storm-sky': 'storm clouds dramatic sky',
  'mountain-sunset': 'mountain sunset golden light',
  'urban-skyline': 'city skyline sunset',
  'coastal-cliffs': 'coastal cliffs dramatic seaside',
  'modern-building': 'modern architecture clean lines',
  'lavender-field': 'lavender field purple flowers',
  'water-ripples': 'water ripples abstract patterns',
  'cloud-formations': 'dramatic cloud formations sky',
  'rainy-street': 'rain street reflections urban',
  'wheat-field': 'golden wheat field summer'
};

async function searchUnsplashImage(query) {
  const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
    headers: {
      'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No images found for query: ${query}`);
  }

  return data.results[0].urls.regular;
}

async function downloadAndProcessImage(imageUrl, heroId) {
  console.log(`📥 Downloading: ${imageUrl}`);
  
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.statusText}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

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
  console.log(`✅ Uploaded: ${key} → ${url} (${processedBuffer.length} bytes)`);
  
  return url;
}

async function restoreHeroImages() {
  console.log('🎨 Restoring hero images with authentic photos from Unsplash...');
  
  let successCount = 0;
  let errorCount = 0;

  // Get all hero images from database
  const dbHeroImages = await db.select().from(heroImages);
  
  for (const hero of dbHeroImages) {
    try {
      console.log(`\n🖼️  Processing: ${hero.name} (${hero.id})`);
      
      const searchTerm = HERO_SEARCH_TERMS[hero.id];
      if (!searchTerm) {
        console.log(`⚠️  No search term defined for ${hero.id}, skipping...`);
        continue;
      }

      // Search for appropriate image
      const imageUrl = await searchUnsplashImage(searchTerm);
      
      // Download and process image
      const newUrl = await downloadAndProcessImage(imageUrl, hero.id);
      
      // Update database record
      await db.update(heroImages)
        .set({ 
          url: newUrl,
          updatedAt: new Date()
        })
        .where(eq(heroImages.id, hero.id));
      
      console.log(`✅ Successfully restored: ${hero.name}`);
      successCount++;
      
      // Small delay to be respectful to Unsplash API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error restoring ${hero.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Restoration Summary:`);
  console.log(`   ✅ Success: ${successCount} images`);
  console.log(`   ❌ Errors: ${errorCount} images`);
  console.log(`\n🎉 Hero image restoration complete!`);
}

restoreHeroImages().then(() => {
  console.log('\n✅ All done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});