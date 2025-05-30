// DISABLED: External image fetching removed to prevent hero image inconsistencies
// This file has been disabled to lock in the current hero image collection
// All hero images now serve exclusively from object storage

import { storage } from "./storage";

// DISABLED: External fetching functions removed
async function fetchUnsplashHeroImage(query: string) {
  throw new Error('External hero image fetching is disabled - using locked object storage collection only');
  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&w=1920&h=1080`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      return {
        id: photo.id,
        url: photo.urls.regular,
        downloadUrl: photo.links.download_location,
        description: photo.description || photo.alt_description || '',
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        unsplashUrl: photo.links.html
      };
    } else {
      throw new Error('No photos found for query');
    }
  } catch (error) {
    console.error(`Error fetching from Unsplash: ${error}`);
    throw error;
  }
}

async function downloadHeroImage(imageUrl: string, heroId: string): Promise<string> {
  try {
    console.log(`📥 Downloading hero image: ${heroId}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${heroId}.jpg`;
    
    // Upload to object storage with correct options structure
    const uploadResult = await uploadImage(buffer, {
      userId: 43075889, // Admin user ID for hero images
      originalFilename: fileName,
      mimeType: 'image/jpeg',
      imageType: 'hero'
    });
    
    console.log(`✅ Uploaded to object storage: ${uploadResult.key}`);
    
    return uploadResult.url;
  } catch (error) {
    console.error(`Error downloading hero image: ${error}`);
    throw error;
  }
}

export async function populateRemainingHeroImages(): Promise<number> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is required but not provided');
  }

  console.log("🎨 Fetching remaining hero images from Unsplash...");
  console.log(`Target: ${heroImageQueries.length} new hero images`);
  
  let successCount = 0;
  const errors: string[] = [];
  
  for (const imageQuery of heroImageQueries) {
    try {
      console.log(`📸 Fetching: ${imageQuery.name} (${imageQuery.query})`);
      
      // Check if this hero image already exists
      const existing = await storage.getHeroImageById(imageQuery.id);
      if (existing) {
        console.log(`⏭️  Skipping ${imageQuery.name} - already exists`);
        continue;
      }
      
      // Fetch photo from Unsplash
      const unsplashPhoto = await fetchUnsplashHeroImage(imageQuery.query);
      
      // Download and store the image
      const imageUrl = await downloadHeroImage(unsplashPhoto.url, imageQuery.id);
      
      // Create hero image record in database
      await storage.createHeroImage({
        id: imageQuery.id,
        name: imageQuery.name,
        description: imageQuery.description,
        url: imageUrl,
        isActive: true,
        isDefault: false,
        metadata: {
          photographer: unsplashPhoto.photographer,
          photographerUrl: unsplashPhoto.photographerUrl,
          source: "Unsplash",
          sourceUrl: unsplashPhoto.unsplashUrl,
          query: imageQuery.query,
          unsplashId: unsplashPhoto.id
        }
      });
      
      console.log(`✅ Added hero image: ${imageQuery.name} by ${unsplashPhoto.photographer}`);
      successCount++;
      
      // Small delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      const errorMsg = `❌ Failed to add ${imageQuery.name}: ${error instanceof Error ? error.message : error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }
  
  console.log(`🎉 Hero image population completed!`);
  console.log(`✅ Successfully added: ${successCount}/${heroImageQueries.length} hero images`);
  
  if (errors.length > 0) {
    console.log(`⚠️  Errors encountered:`);
    errors.forEach(error => console.log(`   ${error}`));
  }
  
  return successCount;
}

// Execute the population
populateRemainingHeroImages()
  .then(count => {
    console.log(`🎯 Final result: Added ${count} new hero images`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Hero image population failed:', error);
    process.exit(1);
  });