/**
 * Fix hero image URLs to match actual files in object storage
 */

import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixHeroImageUrls() {
  const client = new Client();
  
  console.log('🔧 Starting hero image URL fix...');
  
  try {
    // List all files in the global/hero-images folder
    const objectList = await client.list({ prefix: 'global/hero-images/' });
    const availableFiles = objectList.objects?.map(obj => obj.key) || [];
    
    console.log('📁 Available hero image files in object storage:');
    availableFiles.forEach(file => console.log(`   ${file}`));
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    
    console.log('\n🗄️  Hero images in database:');
    dbHeroImages.forEach(img => console.log(`   ${img.id}: ${img.url}`));
    
    // Update URLs to match available files
    for (const heroImage of dbHeroImages) {
      // Find matching file in object storage
      const matchingFile = availableFiles.find(file => 
        file.includes(heroImage.id) || 
        file.includes(heroImage.name.toLowerCase().replace(/\s+/g, '-'))
      );
      
      if (matchingFile) {
        const newUrl = `/images/${matchingFile}`;
        
        if (heroImage.url !== newUrl) {
          await db.update(heroImages)
            .set({ 
              url: newUrl,
              updatedAt: new Date()
            })
            .where(eq(heroImages.id, heroImage.id));
          
          console.log(`✅ Updated ${heroImage.id}: ${heroImage.url} → ${newUrl}`);
        } else {
          console.log(`✓ ${heroImage.id} already has correct URL`);
        }
      } else {
        console.log(`⚠️  No matching file found for ${heroImage.id}`);
      }
    }
    
    console.log('\n🎉 Hero image URL fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing hero image URLs:', error);
    throw error;
  }
}

// Execute the fix
fixHeroImageUrls()
  .then(() => {
    console.log('👍 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });