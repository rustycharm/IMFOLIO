import { Client } from '@replit/object-storage';
import crypto from 'crypto';

async function investigateSameEnvironmentDivergence() {
  console.log('Investigating image divergence within same environment...');
  
  try {
    const client = new Client();
    
    // Test if there are multiple storage "namespaces" or "buckets"
    console.log('\n1. Testing different storage access patterns:');
    
    const testImage = 'autumn-colors';
    const possibleStoragePaths = [
      `global/hero-images/${testImage}.jpg`,
      `hero-images/${testImage}.jpg`,
      `${testImage}.jpg`,
      `images/global/hero-images/${testImage}.jpg`,
      `production/global/hero-images/${testImage}.jpg`,
      `dev/global/hero-images/${testImage}.jpg`,
      `staging/global/hero-images/${testImage}.jpg`,
      `backup/global/hero-images/${testImage}.jpg`,
      `old/global/hero-images/${testImage}.jpg`,
      `v1/global/hero-images/${testImage}.jpg`,
      `v2/global/hero-images/${testImage}.jpg`
    ];
    
    const foundVersions = [];
    
    for (const path of possibleStoragePaths) {
      try {
        const exists = await client.exists(path);
        if (exists.ok && exists.value) {
          const download = await client.downloadAsBytes(path);
          if (download.ok) {
            const buffer = Buffer.from(download.value[0]);
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            
            foundVersions.push({
              path,
              size: buffer.length,
              hash,
              shortHash: hash.substring(0, 8)
            });
            
            console.log(`  Found: ${path} - ${buffer.length} bytes - ${hash.substring(0, 8)}`);
          }
        }
      } catch (error) {
        // Silent continue
      }
    }
    
    console.log(`\nFound ${foundVersions.length} versions of ${testImage}:`);
    
    // Check if any have different content
    const uniqueHashes = new Set(foundVersions.map(v => v.hash));
    if (uniqueHashes.size > 1) {
      console.log('🚨 MULTIPLE DIFFERENT IMAGES FOUND WITH SAME NAME!');
      
      // Group by hash to see which are identical
      const hashGroups = {};
      foundVersions.forEach(version => {
        if (!hashGroups[version.hash]) {
          hashGroups[version.hash] = [];
        }
        hashGroups[version.hash].push(version.path);
      });
      
      Object.entries(hashGroups).forEach(([hash, paths]) => {
        console.log(`  Hash ${hash.substring(0, 8)}: ${paths.join(', ')}`);
      });
    } else if (foundVersions.length > 1) {
      console.log('All versions are identical (same content hash)');
    }
    
    // 2. Test other hero images for the same pattern
    console.log('\n2. Testing other hero images for multiple versions:');
    
    const otherImages = ['cherry-blossoms', 'ocean-waves', 'desert-dunes'];
    
    for (const imageId of otherImages) {
      console.log(`\nTesting ${imageId}:`);
      
      const imagePaths = [
        `global/hero-images/${imageId}.jpg`,
        `hero-images/${imageId}.jpg`,
        `${imageId}.jpg`,
        `backup/${imageId}.jpg`,
        `old/global/hero-images/${imageId}.jpg`
      ];
      
      const imageVersions = [];
      
      for (const path of imagePaths) {
        try {
          const exists = await client.exists(path);
          if (exists.ok && exists.value) {
            const download = await client.downloadAsBytes(path);
            if (download.ok) {
              const buffer = Buffer.from(download.value[0]);
              const hash = crypto.createHash('md5').update(buffer).digest('hex');
              imageVersions.push({ path, hash: hash.substring(0, 8) });
            }
          }
        } catch (error) {
          // Silent continue
        }
      }
      
      if (imageVersions.length > 0) {
        console.log(`  Found ${imageVersions.length} version(s):`);
        imageVersions.forEach(v => console.log(`    ${v.path} - ${v.hash}`));
        
        const uniqueImageHashes = new Set(imageVersions.map(v => v.hash));
        if (uniqueImageHashes.size > 1) {
          console.log(`  🚨 ${imageId} has ${uniqueImageHashes.size} different versions!`);
        }
      }
    }
    
    // 3. Check if there's any routing or proxy logic that could cause different images to be served
    console.log('\n3. Checking for conditional image serving logic:');
    
    // Test the same image request with different user agents
    const testUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari',
      'Replit-Desktop-App',
      'curl/7.68.0'
    ];
    
    // This would require HTTP testing which we'll implement separately
    console.log('  User agent testing would require HTTP client testing');
    
    // 4. Look for any time-based or conditional logic in image serving
    console.log('\n4. Summary of findings:');
    console.log(`Total ${testImage} versions found: ${foundVersions.length}`);
    if (foundVersions.length > 1) {
      console.log('This confirms multiple versions exist in storage');
    } else {
      console.log('Only one version found - divergence must be elsewhere');
    }
    
  } catch (error) {
    console.error('Error investigating divergence:', error);
  }
}

investigateSameEnvironmentDivergence().then(() => {
  console.log('\nSame-environment divergence investigation complete');
  process.exit(0);
}).catch(console.error);