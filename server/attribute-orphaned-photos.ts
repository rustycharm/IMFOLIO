/**
 * Attribute orphaned photos to users with AI-generated authentic metadata
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos } from '../shared/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface OrphanedPhoto {
  filePath: string;
  userId: string;
  filename: string;
  timestamp: number;
}

async function analyzeImageWithAI(imageBuffer: Buffer): Promise<{ title: string; description: string }> {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this photograph and provide a creative and compelling title (2-3 words with no hyphens or dashes or other special characters) and an artistic description (1-2 sentences) suitable for a professional photography portfolio. Focus on composition, mood, and visual elements. Respond in JSON format with 'title' and 'description' fields."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      title: result.title || 'Untitled Photograph',
      description: result.description || 'A beautiful photographic composition.'
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return {
      title: 'Untitled Photograph',
      description: 'A beautiful photographic composition.'
    };
  }
}

async function findOrphanedPhotos(): Promise<OrphanedPhoto[]> {
  console.log('🔍 Finding orphaned photos...');
  
  // Get all photos from storage
  const client = new Client();
  const result = await client.list();
  if (!result.ok) throw new Error('Failed to list storage');
  
  const storagePhotos = result.value
    .filter((file: any) => (file.name || '').includes('photo/'))
    .map((file: any) => file.name);
  
  // Get all photos from database
  const dbPhotos = await db.select({ imageUrl: photos.imageUrl }).from(photos);
  const dbUrls = new Set(dbPhotos.map(p => p.imageUrl));
  
  // Find orphaned files
  const orphaned: OrphanedPhoto[] = [];
  
  for (const filePath of storagePhotos) {
    const expectedUrl = `/images/${filePath}`;
    if (!dbUrls.has(expectedUrl)) {
      const userMatch = filePath.match(/photo\/(\d+)\//);
      const userId = userMatch ? userMatch[1] : null;
      const filename = filePath.split('/').pop() || '';
      const timestampMatch = filename.match(/^(\d+)-/);
      const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
      
      if (userId) {
        orphaned.push({ filePath, userId, filename, timestamp });
      }
    }
  }
  
  return orphaned;
}

async function attributePhotosToUser(): Promise<void> {
  console.log('📸 Starting photo attribution process...');
  
  const orphanedPhotos = await findOrphanedPhotos();
  console.log(`Found ${orphanedPhotos.length} orphaned photos to attribute`);
  
  if (orphanedPhotos.length === 0) {
    console.log('✅ No orphaned photos found');
    return;
  }
  
  let processed = 0;
  const client = new Client();
  
  for (const photo of orphanedPhotos) {
    try {
      console.log(`\n📷 Processing: ${photo.filename} (User: ${photo.userId})`);
      
      // Download image for AI analysis
      const imageResult = await client.downloadAsBytes(photo.filePath);
      if (!imageResult.ok) {
        console.error(`Failed to download ${photo.filename}`);
        continue;
      }
      
      // Analyze with AI
      console.log('🤖 Analyzing image with AI...');
      const { title, description } = await analyzeImageWithAI(imageResult.value);
      console.log(`   Title: "${title}"`);
      console.log(`   Description: "${description}"`);
      
      // Create database entry
      const imageUrl = `/images/${photo.filePath}`;
      await db.insert(photos).values({
        userId: photo.userId,
        title,
        description,
        imageUrl,
        featured: false, // New photos default to not featured
        createdAt: new Date(photo.timestamp),
        updatedAt: new Date()
      });
      
      processed++;
      console.log(`✅ Attributed photo ${processed}/${orphanedPhotos.length}`);
      
    } catch (error) {
      console.error(`❌ Failed to process ${photo.filename}:`, error);
    }
  }
  
  console.log(`\n🎉 Attribution complete: ${processed} photos added to database`);
}

// Run the attribution process
attributePhotosToUser().catch(console.error);