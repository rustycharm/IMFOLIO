import { Client } from '@replit/object-storage';
import crypto from 'crypto';
import fetch from 'node-fetch';

async function traceImagePipeline() {
  console.log('Deep trace of image serving pipeline...');
  
  try {
    // Test the autumn-colors image that you mentioned shows differently
    const testImagePath = 'global/hero-images/autumn-colors.jpg';
    const testImageUrl = '/images/global/hero-images/autumn-colors.jpg';
    
    console.log(`\nTesting autumn-colors image pipeline:`);
    console.log(`Database URL: ${testImageUrl}`);
    console.log(`Expected storage path: ${testImagePath}`);
    
    // 1. Direct object storage access
    console.log('\n1. Direct Object Storage Access:');
    const client = new Client();
    const directAccess = await client.downloadAsBytes(testImagePath);
    
    if (directAccess.ok) {
      const directBuffer = Buffer.from(directAccess.value[0]);
      const directHash = crypto.createHash('md5').update(directBuffer).digest('hex');
      console.log(`  Direct storage: ${directBuffer.length} bytes, hash: ${directHash}`);
    } else {
      console.log(`  Direct storage: FAILED`);
    }
    
    // 2. HTTP request through the application server
    console.log('\n2. HTTP Request through Application:');
    try {
      const httpResponse = await fetch(`http://localhost:5000${testImageUrl}`);
      if (httpResponse.ok) {
        const httpBuffer = await httpResponse.buffer();
        const httpHash = crypto.createHash('md5').update(httpBuffer).digest('hex');
        console.log(`  HTTP response: ${httpBuffer.length} bytes, hash: ${httpHash}`);
        
        // Compare hashes
        if (directAccess.ok) {
          const directHash = crypto.createHash('md5').update(Buffer.from(directAccess.value[0])).digest('hex');
          if (httpHash === directHash) {
            console.log(`  ✅ HTTP matches direct storage`);
          } else {
            console.log(`  🚨 HTTP DIFFERS from direct storage!`);
            console.log(`    Direct: ${directHash}`);
            console.log(`    HTTP: ${httpHash}`);
          }
        }
      } else {
        console.log(`  HTTP request failed: ${httpResponse.status} ${httpResponse.statusText}`);
      }
    } catch (error) {
      console.log(`  HTTP request error: ${error.message}`);
    }
    
    // 3. Check for environment-specific storage instances
    console.log('\n3. Checking for Environment-Specific Storage:');
    
    // Look for any environment variables that might indicate multiple storage sources
    const storageVars = Object.keys(process.env).filter(key => 
      key.toLowerCase().includes('storage') || 
      key.toLowerCase().includes('bucket') ||
      key.toLowerCase().includes('cdn') ||
      key.toLowerCase().includes('image')
    );
    
    if (storageVars.length > 0) {
      console.log(`  Found storage-related environment variables:`);
      storageVars.forEach(varName => {
        const value = process.env[varName];
        console.log(`    ${varName}: ${value ? value.substring(0, 50) + '...' : 'undefined'}`);
      });
    } else {
      console.log(`  No storage-related environment variables found`);
    }
    
    // 4. Test other images to see if the pattern is consistent
    console.log('\n4. Testing Other Images for Pattern:');
    const testImages = [
      'cherry-blossoms',
      'ocean-waves', 
      'desert-dunes'
    ];
    
    for (const imageId of testImages) {
      const imagePath = `global/hero-images/${imageId}.jpg`;
      const imageUrl = `/images/${imagePath}`;
      
      console.log(`\n  Testing ${imageId}:`);
      
      // Direct storage
      const directResult = await client.downloadAsBytes(imagePath);
      let directHash = null;
      if (directResult.ok) {
        const buffer = Buffer.from(directResult.value[0]);
        directHash = crypto.createHash('md5').update(buffer).digest('hex');
        console.log(`    Direct: ${buffer.length} bytes, ${directHash}`);
      }
      
      // HTTP
      try {
        const httpResp = await fetch(`http://localhost:5000${imageUrl}`);
        if (httpResp.ok) {
          const httpBuf = await httpResp.buffer();
          const httpHash = crypto.createHash('md5').update(httpBuf).digest('hex');
          console.log(`    HTTP: ${httpBuf.length} bytes, ${httpHash}`);
          
          if (directHash && httpHash !== directHash) {
            console.log(`    🚨 MISMATCH DETECTED for ${imageId}!`);
          }
        }
      } catch (error) {
        console.log(`    HTTP error: ${error.message}`);
      }
    }
    
    // 5. Check for any CDN or proxy configurations
    console.log('\n5. Checking for CDN/Proxy Configurations:');
    
    // Look for any static file serving configurations
    console.log(`  Current working directory: ${process.cwd()}`);
    console.log(`  PORT: ${process.env.PORT || 'undefined'}`);
    console.log(`  REPLIT_CLUSTER: ${process.env.REPLIT_CLUSTER || 'undefined'}`);
    console.log(`  REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS || 'undefined'}`);
    
  } catch (error) {
    console.error('Error in pipeline trace:', error);
  }
}

traceImagePipeline().then(() => {
  console.log('\nImage pipeline trace complete');
  process.exit(0);
}).catch(console.error);