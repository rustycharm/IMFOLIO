import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function mapDatabaseToStorage() {
  console.log('Mapping database URLs to actual storage keys...');
  
  try {
    const client = new Client();
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    
    // Get all files from object storage
    const allFiles = await client.list();
    const storageFiles = allFiles.ok ? allFiles.value : [];
    
    console.log(`Database entries: ${dbHeroImages.length}`);
    console.log(`Storage files: ${storageFiles.length}`);
    
    // Map each database entry to storage
    for (const hero of dbHeroImages) {
      console.log(`\nDatabase Entry: ${hero.name} (${hero.id})`);
      console.log(`  Database URL: ${hero.url}`);
      
      // Convert database URL to expected storage key
      const expectedKey = hero.url.replace('/images/', '');
      console.log(`  Expected storage key: ${expectedKey}`);
      
      // Look for exact match
      const exactMatch = storageFiles.find(file => file.key === expectedKey);
      if (exactMatch) {
        console.log(`  ✅ Exact match found: ${exactMatch.key}`);
        continue;
      }
      
      // Look for partial matches
      const partialMatches = storageFiles.filter(file => 
        file.key && (
          file.key.includes(hero.id) ||
          hero.url.includes(file.key) ||
          file.key.toLowerCase().includes(hero.name.toLowerCase().replace(/\s+/g, '-'))
        )
      );
      
      if (partialMatches.length > 0) {
        console.log(`  🔍 Partial matches found:`);
        partialMatches.forEach(match => {
          console.log(`    ${match.key} (${match.size || 'unknown'} bytes)`);
        });
      } else {
        console.log(`  ❌ No storage file found for ${hero.id}`);
      }
    }
    
    // Look for orphaned storage files
    console.log(`\nOrphaned storage files (not referenced in database):`);
    const referencedKeys = dbHeroImages.map(hero => hero.url.replace('/images/', ''));
    
    for (const file of storageFiles) {
      if (file.key && !referencedKeys.includes(file.key)) {
        // Check if it looks like a hero image
        if (file.key.includes('global/hero') || file.key.includes('hero-images')) {
          console.log(`  🏷️ Orphaned hero image: ${file.key} (${file.size || 'unknown'} bytes)`);
        }
      }
    }
    
    // Specifically look for all global/hero-images files
    console.log(`\nAll files in global/hero-images directory:`);
    const heroImageFiles = storageFiles.filter(file => 
      file.key && file.key.startsWith('global/hero-images/')
    );
    
    heroImageFiles.forEach(file => {
      const isReferenced = referencedKeys.includes(file.key);
      console.log(`  ${file.key} - ${isReferenced ? 'Referenced' : 'Orphaned'} (${file.size || 'unknown'} bytes)`);
    });
    
  } catch (error) {
    console.error('Error during mapping:', error);
  }
}

mapDatabaseToStorage().then(() => {
  console.log('\nMapping complete');
  process.exit(0);
}).catch(console.error);