import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function clearHeroCacheAndForceRefresh() {
  console.log('🔄 Clearing hero image cache and forcing refresh...');
  
  try {
    // Update all hero images with new timestamps to bust cache
    const allHeroImages = await db.select().from(heroImages);
    
    console.log(`📊 Found ${allHeroImages.length} hero images to refresh`);
    
    for (const hero of allHeroImages) {
      await db.update(heroImages)
        .set({ 
          updatedAt: new Date() // This will force cache invalidation
        })
        .where(eq(heroImages.id, hero.id));
      
      console.log(`✅ Cache busted for: ${hero.name}`);
    }
    
    console.log('🎉 All hero image caches cleared!');
    console.log('📝 Both environments should now show consistent images');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

clearHeroCacheAndForceRefresh().then(() => {
  console.log('✅ Cache clear complete');
  process.exit(0);
}).catch(console.error);