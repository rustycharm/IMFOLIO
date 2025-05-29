import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';
import { like, or } from 'drizzle-orm';

async function investigateCherryBlossoms() {
  console.log('🌸 Investigating cherry blossom images in database and storage...');
  
  try {
    const client = new Client();
    
    // Search database for any cherry blossom related entries
    console.log('\n📊 Searching database for cherry blossom entries...');
    const cherryEntries = await db.select().from(heroImages).where(
      or(
        like(heroImages.name, '%cherry%'),
        like(heroImages.name, '%blossom%'),
        like(heroImages.id, '%cherry%'),
        like(heroImages.id, '%blossom%'),
        like(heroImages.description, '%cherry%'),
        like(heroImages.description, '%blossom%')
      )
    );
    
    console.log(`Found ${cherryEntries.length} cherry blossom entries in database:`);
    for (const entry of cherryEntries) {
      console.log(`\n🖼️  Database Entry:`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   Name: ${entry.name}`);
      console.log(`   URL: ${entry.url}`);
      console.log(`   Description: ${entry.description}`);
      console.log(`   Created: ${entry.createdAt}`);
      console.log(`   Updated: ${entry.updatedAt}`);
      console.log(`   Added by: ${entry.addedBy}`);
    }
    
    // Search object storage for any cherry blossom related files
    console.log('\n📁 Searching object storage for cherry blossom files...');
    const allFiles = await client.list();
    
    if (allFiles.ok) {
      const cherryFiles = allFiles.value.filter(file => 
        file.key && (
          file.key.toLowerCase().includes('cherry') || 
          file.key.toLowerCase().includes('blossom')
        )
      );
      
      console.log(`\nFound ${cherryFiles.length} cherry blossom files in object storage:`);
      
      for (const file of cherryFiles) {
        console.log(`\n📄 Storage File:`);
        console.log(`   Key: ${file.key}`);
        console.log(`   Size: ${file.size || 'unknown'} bytes`);
        console.log(`   Last Modified: ${file.lastModified || 'unknown'}`);
        
        // Check if this file is referenced in database
        const referencedInDb = cherryEntries.some(entry => 
          entry.url.includes(file.key) || file.key.includes(entry.id)
        );
        console.log(`   Referenced in DB: ${referencedInDb ? 'YES' : 'NO'}`);
        
        // Download and analyze the file
        try {
          const result = await client.downloadAsBytes(file.key);
          if (result.ok) {
            const buffer = Buffer.from(result.value[0]);
            const crypto = await import('crypto');
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            console.log(`   Actual Size: ${buffer.length} bytes`);
            console.log(`   Content Hash: ${hash}`);
          }
        } catch (error) {
          console.log(`   Error reading file: ${error.message}`);
        }
      }
    }
    
    // Look for any files with similar patterns but different naming
    console.log('\n🔍 Searching for similar patterns with different naming...');
    const allFilesFlat = allFiles.ok ? allFiles.value : [];
    const potentialCherryFiles = allFilesFlat.filter(file => {
      if (!file.key) return false;
      const key = file.key.toLowerCase();
      return (
        key.includes('pink') || 
        key.includes('flower') || 
        key.includes('spring') ||
        key.includes('sakura') ||
        key.includes('bloom')
      );
    });
    
    if (potentialCherryFiles.length > 0) {
      console.log(`\nFound ${potentialCherryFiles.length} files with similar themes:`);
      potentialCherryFiles.forEach(file => {
        console.log(`   ${file.key}`);
      });
    }
    
    // Check for any duplicate IDs or names that might be causing conflicts
    console.log('\n🔍 Checking for potential ID conflicts...');
    const allHeroImages = await db.select().from(heroImages);
    const idMap = new Map();
    const nameMap = new Map();
    
    for (const hero of allHeroImages) {
      // Check for duplicate IDs
      if (idMap.has(hero.id)) {
        console.log(`🚨 DUPLICATE ID FOUND: ${hero.id}`);
        console.log(`   Entry 1: ${idMap.get(hero.id).name} - ${idMap.get(hero.id).url}`);
        console.log(`   Entry 2: ${hero.name} - ${hero.url}`);
      } else {
        idMap.set(hero.id, hero);
      }
      
      // Check for duplicate names
      if (nameMap.has(hero.name)) {
        console.log(`🚨 DUPLICATE NAME FOUND: ${hero.name}`);
        console.log(`   Entry 1: ${nameMap.get(hero.name).id} - ${nameMap.get(hero.name).url}`);
        console.log(`   Entry 2: ${hero.id} - ${hero.url}`);
      } else {
        nameMap.set(hero.name, hero);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

investigateCherryBlossoms().then(() => {
  console.log('\n✅ Cherry blossom investigation complete');
  process.exit(0);
}).catch(console.error);