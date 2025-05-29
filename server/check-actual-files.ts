import { Client } from '@replit/object-storage';
import { db } from './db';
import { heroImages } from '../shared/schema';

async function checkActualFiles() {
  console.log('🔍 Checking actual file names in storage...');
  
  try {
    const client = new Client();
    
    // Get actual files in storage
    const heroFilesResult = await client.list({ prefix: 'global/hero-images/' });
    const heroFiles = heroFilesResult.ok ? heroFilesResult.value : [];
    
    console.log('\n📁 Actual files in global/hero-images/:');
    heroFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.size} bytes)`);
    });
    
    // Get database expectations
    const dbHeroImages = await db.select().from(heroImages);
    
    console.log('\n💾 Database expects these files:');
    dbHeroImages.forEach((img, index) => {
      const expectedFile = img.url?.replace('/images/', '') || 'NO URL';
      console.log(`${index + 1}. ${expectedFile} (from ${img.name})`);
    });
    
    // Find cherry blossom specific files
    console.log('\n🌸 Cherry blossom analysis:');
    const cherryInStorage = heroFiles.filter(f => 
      f.name?.toLowerCase().includes('cherry') || 
      f.name?.toLowerCase().includes('blossom')
    );
    
    const cherryInDb = dbHeroImages.filter(img => 
      img.id.includes('cherry') || 
      img.name?.toLowerCase().includes('cherry') ||
      img.name?.toLowerCase().includes('blossom')
    );
    
    console.log('Storage files containing "cherry" or "blossom":');
    cherryInStorage.forEach(f => console.log(`  - ${f.name}`));
    
    console.log('Database records for cherry blossoms:');
    cherryInDb.forEach(img => console.log(`  - Expects: ${img.url?.replace('/images/', '')}`));
    
    // Look for potential duplicates or variations
    console.log('\n🔄 Looking for duplicate patterns:');
    const fileNameGroups = new Map();
    
    heroFiles.forEach(file => {
      const baseName = file.name?.split('.')[0] || '';
      if (!fileNameGroups.has(baseName)) {
        fileNameGroups.set(baseName, []);
      }
      fileNameGroups.get(baseName).push(file.name);
    });
    
    fileNameGroups.forEach((files, baseName) => {
      if (files.length > 1) {
        console.log(`Multiple files for "${baseName}": ${files.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkActualFiles().catch(console.error);