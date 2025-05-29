import { Client } from '@replit/object-storage';
import crypto from 'crypto';

async function traceCherryVariations() {
  console.log('🌸 Investigating cherry blossom image variations...');
  
  try {
    const client = new Client();
    
    // Download the current cherry blossom file multiple times to check consistency
    const downloads = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`📥 Download attempt ${i}...`);
      const result = await client.downloadAsBytes('global/hero-images/cherry-blossoms.jpg');
      
      if (result.ok) {
        const buffer = Buffer.from(result.value[0]);
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        
        downloads.push({
          attempt: i,
          size: buffer.length,
          hash: hash,
          firstBytes: buffer.subarray(0, 16).toString('hex')
        });
        
        console.log(`  Size: ${buffer.length} bytes`);
        console.log(`  MD5: ${hash}`);
        console.log(`  First 16 bytes: ${buffer.subarray(0, 16).toString('hex')}`);
      } else {
        console.log(`  Failed: ${result.error}`);
      }
    }
    
    // Check if all downloads are identical
    const uniqueHashes = new Set(downloads.map(d => d.hash));
    
    console.log('\n📊 Consistency check:');
    if (uniqueHashes.size === 1) {
      console.log('✅ All downloads are identical - the stored file is consistent');
    } else {
      console.log('⚠️ Downloads differ! This suggests the file is being modified or replaced');
      downloads.forEach(d => {
        console.log(`  Attempt ${d.attempt}: ${d.hash} (${d.size} bytes)`);
      });
    }
    
    // Check file metadata
    console.log('\n📋 File metadata:');
    const exists = await client.exists('global/hero-images/cherry-blossoms.jpg');
    console.log(`File exists: ${exists.ok && exists.value}`);
    
    // Test accessing via URL to see if there's a proxy/cache layer affecting it
    console.log('\n🔗 Testing URL access consistency...');
    
    for (let i = 1; i <= 2; i++) {
      try {
        const response = await fetch(`http://localhost:5000/images/global/hero-images/cherry-blossoms.jpg?_=${Date.now()}`);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
          console.log(`URL fetch ${i}: ${hash} (${buffer.byteLength} bytes)`);
        }
      } catch (error) {
        console.log(`URL fetch ${i} failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error during investigation:', error);
  }
}

traceCherryVariations().catch(console.error);