import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';
import crypto from 'crypto';

async function traceImageSources() {
  console.log('🔍 Tracing actual image sources and content...');
  
  try {
    const client = new Client();
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    console.log(`\n📊 Analyzing ${dbHeroImages.length} hero images`);
    
    const imageAnalysis = [];
    
    for (const hero of dbHeroImages) {
      const storageKey = hero.url.replace('/images/', '');
      console.log(`\n🖼️  ${hero.name} (${hero.id})`);
      console.log(`   URL: ${hero.url}`);
      console.log(`   Storage Key: ${storageKey}`);
      
      try {
        // Download the actual image content
        const result = await client.downloadAsBytes(storageKey);
        if (result.ok) {
          const buffer = Buffer.from(result.value[0]);
          
          // Generate hash of actual image content
          const imageHash = crypto.createHash('md5').update(buffer).digest('hex');
          
          console.log(`   ✅ Size: ${buffer.length} bytes`);
          console.log(`   🔐 Content Hash: ${imageHash}`);
          
          imageAnalysis.push({
            id: hero.id,
            name: hero.name,
            url: hero.url,
            size: buffer.length,
            hash: imageHash,
            created: hero.createdAt,
            updated: hero.updatedAt
          });
          
        } else {
          console.log(`   ❌ Failed to download image`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Check for duplicate hashes (same image content with different names)
    console.log('\n🔍 Checking for duplicate image content...');
    const hashMap = new Map();
    
    for (const image of imageAnalysis) {
      if (hashMap.has(image.hash)) {
        const existing = hashMap.get(image.hash);
        console.log(`🚨 DUPLICATE CONTENT FOUND:`);
        console.log(`   Image 1: ${existing.name} (${existing.id}) - ${existing.url}`);
        console.log(`   Image 2: ${image.name} (${image.id}) - ${image.url}`);
        console.log(`   Same content hash: ${image.hash}`);
      } else {
        hashMap.set(image.hash, image);
      }
    }
    
    // Check for same names with different content
    console.log('\n🔍 Checking for same names with different content...');
    const nameMap = new Map();
    
    for (const image of imageAnalysis) {
      if (nameMap.has(image.name)) {
        const existing = nameMap.get(image.name);
        if (existing.hash !== image.hash) {
          console.log(`🚨 SAME NAME, DIFFERENT CONTENT:`);
          console.log(`   Name: ${image.name}`);
          console.log(`   Image 1: ${existing.id} - Hash: ${existing.hash} - Created: ${existing.created}`);
          console.log(`   Image 2: ${image.id} - Hash: ${image.hash} - Created: ${image.created}`);
        }
      } else {
        nameMap.set(image.name, image);
      }
    }
    
    // List all files in object storage to check for orphaned hero images
    console.log('\n🔍 Checking object storage for potential orphaned hero images...');
    const objectList = await client.list();
    
    if (objectList.ok) {
      const allFiles = objectList.value;
      const heroRelatedFiles = allFiles.filter(file => 
        file.key && (
          file.key.includes('hero') || 
          file.key.includes('autumn') || 
          file.key.includes('ocean') || 
          file.key.includes('desert') ||
          file.key.includes('northern') ||
          file.key.includes('forest') ||
          file.key.includes('cherry')
        )
      );
      
      console.log(`\n📁 Found ${heroRelatedFiles.length} hero-related files in storage:`);
      for (const file of heroRelatedFiles) {
        const isReferenced = imageAnalysis.some(img => img.url.includes(file.key));
        console.log(`   ${file.key} ${isReferenced ? '✅' : '🏷️ ORPHANED'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

traceImageSources().then(() => {
  console.log('\n✅ Image source analysis complete');
  process.exit(0);
}).catch(console.error);