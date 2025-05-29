import { storage } from "./storage";
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

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

async function downloadImage(imageUrl: string, fileName: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    
    const buffer = await response.buffer();
    const imagePath = path.join(process.cwd(), 'client', 'public', 'images', 'photo', '43075889', '2025', '05', fileName);
    
    // Ensure directory exists
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, buffer);
    return `/images/photo/43075889/2025/05/${fileName}`;
  } catch (error) {
    console.error(`Error downloading image: ${error}`);
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

    const data = await response.json();
    
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

export async function populateWithUnsplashImages() {
  console.log("🎨 Starting Unsplash image population for IMFOLIO platform...");
  
  // Get admin user dynamically
  const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
  if (adminUsers.length === 0) {
    throw new Error('No admin user found. Please create an admin user first.');
  }
  
  const adminUserId = adminUsers[0].id;
  console.log(`Using admin user: ${adminUserId} for featured photos`);
  let successCount = 0;
  
  for (const photoQuery of photoQueries) {
    try {
      console.log(`📸 Fetching: ${photoQuery.title} (${photoQuery.query})`);
      
      // Fetch photo from Unsplash
      const unsplashPhoto = await fetchUnsplashPhoto(photoQuery.query);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${unsplashPhoto.id}.jpg`;
      
      // Download and save the image
      const localImageUrl = await downloadImage(unsplashPhoto.url, fileName);
      
      // Create photo record in database
      const newPhoto = await storage.createPhoto({
        userId: adminUserId,
        title: photoQuery.title,
        description: `Professional photography: ${unsplashPhoto.description || photoQuery.title}`,
        imageUrl: localImageUrl,
        category: photoQuery.category,
        tags: [photoQuery.category, "professional", "curated"],
        keywords: `${photoQuery.category}, professional photography, ${photoQuery.query}`,
        altText: `${photoQuery.title} - Professional photography`,
        isPublic: true,
        featured: true,
        location: null,
        fileKey: `photo/${adminUserId}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`,
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
  
  console.log(`🎉 Unsplash population completed! Successfully added ${successCount}/${photoQueries.length} photos`);
}

// Run the population immediately
populateWithUnsplashImages().catch(console.error);