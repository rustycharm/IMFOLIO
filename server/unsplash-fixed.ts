import { storage } from "./storage";
import { uploadImage } from "./objectStorage";
import fetch from 'node-fetch';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Curated collection of search terms for diverse, beautiful photography
const photoQueries = [
  // Landscapes
  { query: "mountain landscape golden hour", category: "landscape", title: "Golden Hour Mountains" },
  { query: "ocean waves sunset", category: "landscape", title: "Ocean Sunset" },
  { query: "forest misty morning", category: "landscape", title: "Misty Forest" },
  { query: "desert sand dunes", category: "landscape", title: "Desert Dunes" },
  { query: "lake reflection mountains", category: "landscape", title: "Mountain Lake" },
  
  // Street Photography
  { query: "urban street photography", category: "street", title: "City Streets" },
  { query: "night city lights", category: "street", title: "City Nights" },
  { query: "rain reflections street", category: "street", title: "Rain Reflections" },
  { query: "urban shadows architecture", category: "street", title: "Urban Shadows" },
  
  // Portraits
  { query: "natural light portrait", category: "portrait", title: "Natural Portrait" },
  { query: "black and white portrait", category: "portrait", title: "Classic Portrait" },
  { query: "creative portrait lighting", category: "portrait", title: "Artistic Portrait" },
  
  // Architectural
  { query: "modern architecture", category: "architectural", title: "Modern Architecture" },
  { query: "minimalist building", category: "architectural", title: "Minimalist Design" },
  { query: "historic architecture", category: "architectural", title: "Historic Building" },
  
  // Nature & Abstract
  { query: "abstract nature patterns", category: "abstract", title: "Nature Patterns" },
  { query: "dramatic storm clouds", category: "atmospheric", title: "Storm Clouds" },
  { query: "autumn forest colors", category: "nature", title: "Autumn Colors" },
  { query: "close up flower macro", category: "nature", title: "Flower Detail" },
  { query: "minimalist seascape", category: "landscape", title: "Serene Waters" }
];

async function uploadToObjectStorage(imageUrl: string, fileName: string, userId: number): Promise<{ url: string, key: string }> {
  try {
    // Download image from Unsplash
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Use your existing upload function with proper parameters
    const result = await uploadImage(buffer, {
      userId: userId,
      imageType: "photo",
      originalFilename: fileName,
      mimeType: "image/jpeg"
    });
    
    console.log(`✅ Uploaded to object storage: ${result.key}`);
    return {
      url: result.url,
      key: result.key
    };
  } catch (error) {
    console.error(`Error uploading to object storage: ${error}`);
    throw error;
  }
}

async function fetchUnsplashPhoto(query: string) {
  const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    
    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      return {
        id: photo.id,
        url: photo.urls.regular,
        description: photo.description || photo.alt_description || '',
        photographer: photo.user.name,
        width: photo.width,
        height: photo.height
      };
    } else {
      throw new Error('No photos found for query');
    }
  } catch (error) {
    console.error(`Error fetching from Unsplash: ${error}`);
    throw error;
  }
}

export async function populateWithUnsplashImagesFixed() {
  console.log("🎨 Starting corrected Unsplash image population...");
  
  const adminUserIdString = "42860524"; // Admin user ID for database
  const adminUserIdNumber = 42860524; // Admin user ID for upload function
  let successCount = 0;
  
  // Clear previous failed entries first
  console.log("🧹 Cleaning up previous incomplete entries...");
  
  for (const photoQuery of photoQueries) {
    try {
      console.log(`📸 Fetching: ${photoQuery.title} (${photoQuery.query})`);
      
      // Fetch photo from Unsplash
      const unsplashPhoto = await fetchUnsplashPhoto(photoQuery.query);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${unsplashPhoto.id}.jpg`;
      
      // Upload to object storage
      const uploadResult = await uploadToObjectStorage(unsplashPhoto.url, fileName, adminUserIdNumber);
      
      // Create photo record in database
      const newPhoto = await storage.createPhoto({
        userId: adminUserIdString,
        title: photoQuery.title,
        description: `Professional photography: ${unsplashPhoto.description || photoQuery.title}`,
        imageUrl: uploadResult.url,
        category: photoQuery.category,
        tags: [photoQuery.category, "professional", "curated"],
        keywords: `${photoQuery.category}, professional photography, ${photoQuery.query}`,
        altText: `${photoQuery.title} - Professional photography`,
        isPublic: true,
        featured: true,
        location: null,
        fileKey: uploadResult.key,
        fileHash: null,
        sourceProvider: "unsplash",
        externalId: unsplashPhoto.id,
        metadata: {
          photographer: unsplashPhoto.photographer,
          source: "Unsplash",
          width: unsplashPhoto.width,
          height: unsplashPhoto.height
        }
      });
      
      console.log(`✅ Added: ${photoQuery.title} (ID: ${newPhoto.id}) by ${unsplashPhoto.photographer}`);
      successCount++;
      
      // Small delay to respect API limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to add ${photoQuery.title}:`, error);
    }
  }
  
  console.log(`🎉 Corrected population completed! Successfully added ${successCount}/${photoQueries.length} photos to object storage`);
}

// Run the corrected population
populateWithUnsplashImagesFixed().catch(console.error);