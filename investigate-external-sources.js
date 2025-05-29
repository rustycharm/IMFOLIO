import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function investigateExternalSources() {
  console.log('🔍 Investigating potential external image sources...');
  
  try {
    // Check database for any URLs pointing to external sources
    const dbHeroImages = await db.select().from(heroImages);
    
    console.log('\n📊 Analyzing URL patterns:');
    
    const urlAnalysis = {
      internal: [],
      external: [],
      cdn: [],
      other: []
    };
    
    for (const hero of dbHeroImages) {
      console.log(`\n🖼️  ${hero.name} (${hero.id})`);
      console.log(`   URL: ${hero.url}`);
      console.log(`   Added by: ${hero.addedBy || 'System'}`);
      console.log(`   Created: ${hero.createdAt}`);
      console.log(`   Updated: ${hero.updatedAt}`);
      
      // Categorize URLs
      if (hero.url.startsWith('/images/')) {
        urlAnalysis.internal.push({...hero, category: 'internal'});
        console.log(`   Category: Internal storage`);
      } else if (hero.url.includes('unsplash.com') || hero.url.includes('cdn.')) {
        urlAnalysis.external.push({...hero, category: 'external'});
        console.log(`   Category: External/CDN`);
      } else if (hero.url.includes('http')) {
        urlAnalysis.other.push({...hero, category: 'other_external'});
        console.log(`   Category: Other external`);
      } else {
        urlAnalysis.other.push({...hero, category: 'unknown'});
        console.log(`   Category: Unknown format`);
      }
    }
    
    console.log('\n📊 URL Analysis Summary:');
    console.log(`   Internal storage: ${urlAnalysis.internal.length}`);
    console.log(`   External/CDN: ${urlAnalysis.external.length}`);
    console.log(`   Other external: ${urlAnalysis.other.length}`);
    
    // Check for recent updates that might indicate replacements
    console.log('\n📅 Recent update activity:');
    const recentUpdates = dbHeroImages.filter(hero => 
      new Date(hero.updatedAt) > new Date('2025-05-29')
    );
    
    if (recentUpdates.length > 0) {
      console.log(`Found ${recentUpdates.length} recently updated hero images:`);
      recentUpdates.forEach(hero => {
        console.log(`   ${hero.name}: Updated ${hero.updatedAt}`);
      });
    } else {
      console.log('No recent updates found');
    }
    
    // Check creation dates for patterns
    console.log('\n📅 Creation date patterns:');
    const creationDates = {};
    dbHeroImages.forEach(hero => {
      const date = hero.createdAt.toISOString().split('T')[0];
      if (!creationDates[date]) {
        creationDates[date] = [];
      }
      creationDates[date].push(hero.name);
    });
    
    Object.entries(creationDates).forEach(([date, names]) => {
      console.log(`   ${date}: ${names.length} images (${names.join(', ')})`);
    });
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  }
}

investigateExternalSources().then(() => {
  console.log('\n✅ External source investigation complete');
  process.exit(0);
}).catch(console.error);