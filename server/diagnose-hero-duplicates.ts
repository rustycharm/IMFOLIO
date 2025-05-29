import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages } from '../shared/schema';

async function diagnoseHeroDuplicates() {
  console.log('🔍 Analyzing hero image storage for duplicates...');
  
  try {
    const client = new Client();
    
    // List all files in object storage, specifically checking global/hero-images/
    const heroFilesResult = await client.list({ prefix: 'global/hero-images/' });
    const heroFiles = heroFilesResult.ok ? heroFilesResult.value : [];
    console.log(`📁 Total files in global/hero-images/: ${heroFiles.length}`);
    
    // Also check for any files without prefix to see full storage
    const allStorageResult = await client.list();
    const allStorageFiles = allStorageResult.ok ? allStorageResult.value : [];
    console.log(`📁 Total files in entire storage: ${allStorageFiles.length}`);
    
    // Filter for cherry/blossom related files
    const cherryFiles = heroFiles.filter(obj => 
      obj.key?.toLowerCase().includes('cherry') || 
      obj.key?.toLowerCase().includes('blossom')
    );
    
    console.log('\n🌸 Cherry/Blossom related files:');
    cherryFiles.forEach(file => {
      console.log(`  - ${file.key} (${file.size} bytes, ${file.lastModified})`);
    });
    
    // Check for any files that might be hero images in different locations
    const potentialHeroFiles = allStorageFiles.filter(obj => 
      obj.key?.includes('hero') || 
      obj.key?.includes('global/hero-images/') ||
      obj.key?.includes('cherry') ||
      obj.key?.includes('blossom')
    );
    
    console.log('\n🖼️ All potential hero image files:');
    potentialHeroFiles.forEach(file => {
      console.log(`  - ${file.key} (${file.size} bytes)`);
    });
    
    // Get database records
    const dbHeroImages = await db.select().from(heroImages);
    console.log('\n💾 Hero images in database:');
    
    const cherryDbImages = dbHeroImages.filter(img => 
      img.id.toLowerCase().includes('cherry') || 
      img.name?.toLowerCase().includes('cherry') ||
      img.name?.toLowerCase().includes('blossom')
    );
    
    cherryDbImages.forEach(img => {
      console.log(`  - ID: ${img.id}`);
      console.log(`    Name: ${img.name}`);
      console.log(`    URL: ${img.url}`);
      console.log(`    Image URL: ${img.imageUrl}`);
      console.log(`    Created: ${img.createdAt}`);
      console.log(`    Updated: ${img.updatedAt}`);
      console.log(`    Default: ${img.isDefault}`);
      console.log('');
    });
    
    // Check for URL mismatches or duplicates
    console.log('\n🔄 Checking for issues:');
    
    let issues = 0;
    
    for (const img of dbHeroImages) {
      // Check if URL and imageUrl match
      if (img.url !== img.imageUrl) {
        console.log(`⚠️  URL mismatch for ${img.name}: url=${img.url}, imageUrl=${img.imageUrl}`);
        issues++;
      }
      
      // Check if the referenced file exists in storage
      if (img.url) {
        const storageKey = img.url.replace('/images/', '');
        const fileExists = potentialHeroFiles.some(f => f.key === storageKey);
        if (!fileExists) {
          console.log(`❌ Missing file for ${img.name}: ${storageKey}`);
          issues++;
        }
      }
    }
    
    // Look for duplicate names or similar IDs
    const nameGroups = new Map();
    dbHeroImages.forEach(img => {
      const name = img.name?.toLowerCase() || '';
      if (!nameGroups.has(name)) {
        nameGroups.set(name, []);
      }
      nameGroups.get(name).push(img);
    });
    
    nameGroups.forEach((images, name) => {
      if (images.length > 1) {
        console.log(`🔁 Duplicate name "${name}": ${images.map(i => i.id).join(', ')}`);
        issues++;
      }
    });
    
    console.log(`\n📊 Analysis complete. Found ${issues} potential issues.`);
    
  } catch (error) {
    console.error('Error during analysis:', error);
  }
}

// Run the diagnosis
diagnoseHeroDuplicates().catch(console.error);