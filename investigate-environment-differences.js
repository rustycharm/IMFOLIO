import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function investigateEnvironmentDifferences() {
  console.log('Investigating potential environment differences...');
  
  try {
    // Check current database connection info
    console.log('\nCurrent database environment:');
    console.log(`Database URL exists: ${!!process.env.DATABASE_URL}`);
    console.log(`Node environment: ${process.env.NODE_ENV || 'undefined'}`);
    
    // Get all hero images with full details
    const allHeroImages = await db.select().from(heroImages);
    
    console.log(`\nCurrent database contains ${allHeroImages.length} hero images:`);
    
    // Group by creation date to identify potential batches
    const creationBatches = {};
    allHeroImages.forEach(hero => {
      const date = hero.createdAt.toISOString().split('T')[0];
      if (!creationBatches[date]) {
        creationBatches[date] = [];
      }
      creationBatches[date].push(hero);
    });
    
    console.log('\nHero images grouped by creation date:');
    Object.entries(creationBatches).forEach(([date, images]) => {
      console.log(`\n${date} (${images.length} images):`);
      images.forEach(img => {
        console.log(`  ${img.name} (${img.id}) - Added by: ${img.addedBy || 'System'}`);
        console.log(`    URL: ${img.url}`);
        console.log(`    Updated: ${img.updatedAt.toISOString()}`);
      });
    });
    
    // Check for any URLs that might point to external sources
    console.log('\nChecking for external image sources:');
    const externalImages = allHeroImages.filter(hero => 
      !hero.url.startsWith('/images/') || 
      hero.url.includes('http') || 
      hero.url.includes('cdn') ||
      hero.url.includes('unsplash')
    );
    
    if (externalImages.length > 0) {
      console.log('Found external image sources:');
      externalImages.forEach(img => {
        console.log(`  ${img.name}: ${img.url}`);
      });
    } else {
      console.log('All images use internal storage paths');
    }
    
    // Check for recent modifications that might indicate replacements
    console.log('\nRecent modifications (last 7 days):');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentChanges = allHeroImages.filter(hero => 
      new Date(hero.updatedAt) > weekAgo
    );
    
    if (recentChanges.length > 0) {
      console.log(`Found ${recentChanges.length} recently modified images:`);
      recentChanges.forEach(img => {
        console.log(`  ${img.name}: Updated ${img.updatedAt.toISOString()}`);
      });
    }
    
    // Look for patterns that might indicate multiple image sets
    console.log('\nAnalyzing naming patterns:');
    const namePatterns = {};
    allHeroImages.forEach(hero => {
      const baseName = hero.name.toLowerCase().replace(/[^a-z]/g, '');
      if (!namePatterns[baseName]) {
        namePatterns[baseName] = [];
      }
      namePatterns[baseName].push(hero);
    });
    
    Object.entries(namePatterns).forEach(([pattern, images]) => {
      if (images.length > 1) {
        console.log(`Multiple images with similar names (${pattern}):`);
        images.forEach(img => {
          console.log(`  ${img.name} (${img.id}) - ${img.url}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error investigating environment differences:', error);
  }
}

investigateEnvironmentDifferences().then(() => {
  console.log('\nEnvironment investigation complete');
  process.exit(0);
}).catch(console.error);