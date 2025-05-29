import { Client } from '@replit/object-storage';
import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';
import crypto from 'crypto';

async function traceActualServing() {
  console.log('Tracing actual image serving mechanism...');
  
  try {
    const client = new Client();
    
    // Get all hero images from database
    const dbHeroImages = await db.select().from(heroImages);
    
    // Test direct access to each image following the serving path
    for (const hero of dbHeroImages) {
      console.log(`\nTesting: ${hero.name} (${hero.id})`);
      console.log(`Database URL: ${hero.url}`);
      
      // Extract the actual storage path from the URL
      // URLs are like "/images/global/hero-images/cherry-blossoms.jpg"
      // Storage path should be "global/hero-images/cherry-blossoms.jpg"
      const storagePath = hero.url.replace('/images/', '');
      console.log(`Storage path: ${storagePath}`);
      
      try {
        // Test direct access using the Client.exists method
        const existsResult = await client.exists(storagePath);
        console.log(`Exists check: ${existsResult.ok ? existsResult.value : 'failed'}`);
        
        if (existsResult.ok && existsResult.value) {
          // Download and get actual file info
          const downloadResult = await client.downloadAsBytes(storagePath);
          if (downloadResult.ok) {
            const buffer = Buffer.from(downloadResult.value[0]);
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            
            console.log(`✅ Successfully accessed: ${buffer.length} bytes`);
            console.log(`Content hash: ${hash}`);
            
            // Also test if there are any variations of this file
            const baseName = storagePath.replace('.jpg', '');
            const variations = [
              `${baseName}-v1.jpg`,
              `${baseName}-v2.jpg`,
              `${baseName}_old.jpg`,
              `${baseName}_new.jpg`,
              `${baseName}-original.jpg`,
              `${baseName}-backup.jpg`
            ];
            
            for (const variation of variations) {
              const varExists = await client.exists(variation);
              if (varExists.ok && varExists.value) {
                const varDownload = await client.downloadAsBytes(variation);
                if (varDownload.ok) {
                  const varBuffer = Buffer.from(varDownload.value[0]);
                  const varHash = crypto.createHash('md5').update(varBuffer).digest('hex');
                  
                  if (varHash !== hash) {
                    console.log(`🔍 VARIATION FOUND: ${variation}`);
                    console.log(`  Size: ${varBuffer.length} bytes`);
                    console.log(`  Hash: ${varHash}`);
                    console.log(`  Different from main: YES`);
                  }
                }
              }
            }
          }
        } else {
          console.log(`❌ File not accessible at expected path`);
        }
      } catch (error) {
        console.log(`❌ Error accessing file: ${error.message}`);
      }
    }
    
    // Test if there are multiple cherry blossom files specifically
    console.log('\nSpecific cherry blossom investigation:');
    const cherryPaths = [
      'global/hero-images/cherry-blossoms.jpg',
      'global/hero-images/cherry-blossom.jpg',
      'global/hero-images/cherry.jpg',
      'global/hero-images/sakura.jpg',
      'hero-images/cherry-blossoms.jpg',
      'cherry-blossoms.jpg'
    ];
    
    const foundCherryFiles = [];
    
    for (const path of cherryPaths) {
      try {
        const exists = await client.exists(path);
        if (exists.ok && exists.value) {
          const download = await client.downloadAsBytes(path);
          if (download.ok) {
            const buffer = Buffer.from(download.value[0]);
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            
            foundCherryFiles.push({
              path,
              size: buffer.length,
              hash
            });
            
            console.log(`Found: ${path} - ${buffer.length} bytes - ${hash}`);
          }
        }
      } catch (error) {
        // Silent fail for testing
      }
    }
    
    if (foundCherryFiles.length > 1) {
      console.log('\nMultiple cherry blossom files detected:');
      foundCherryFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path} (${file.size} bytes, hash: ${file.hash})`);
      });
      
      // Check if any have different content
      const uniqueHashes = new Set(foundCherryFiles.map(f => f.hash));
      if (uniqueHashes.size > 1) {
        console.log('🚨 DIFFERENT CHERRY BLOSSOM IMAGES CONFIRMED');
      }
    }
    
  } catch (error) {
    console.error('Error in serving trace:', error);
  }
}

traceActualServing().then(() => {
  console.log('\nActual serving trace complete');
  process.exit(0);
}).catch(console.error);