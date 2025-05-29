import fetch from 'node-fetch';
import crypto from 'crypto';

async function testConditionalServing() {
  console.log('Testing conditional image serving based on request characteristics...');
  
  try {
    const testImageUrl = 'http://localhost:5000/images/global/hero-images/autumn-colors.jpg';
    
    // Test with different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Replit-Desktop-App/1.0',
      'electron',
      'curl/7.68.0',
      ''
    ];
    
    const results = [];
    
    for (const userAgent of userAgents) {
      console.log(`\nTesting with User-Agent: ${userAgent || 'none'}`);
      
      try {
        const headers = {};
        if (userAgent) {
          headers['User-Agent'] = userAgent;
        }
        
        const response = await fetch(testImageUrl, { headers });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
          
          results.push({
            userAgent: userAgent || 'none',
            size: buffer.byteLength,
            hash: hash.substring(0, 8),
            status: response.status,
            contentType: response.headers.get('content-type'),
            cacheControl: response.headers.get('cache-control'),
            etag: response.headers.get('etag')
          });
          
          console.log(`  Status: ${response.status}`);
          console.log(`  Size: ${buffer.byteLength} bytes`);
          console.log(`  Hash: ${hash.substring(0, 8)}`);
          console.log(`  Content-Type: ${response.headers.get('content-type')}`);
          console.log(`  ETag: ${response.headers.get('etag')}`);
        } else {
          console.log(`  Failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
    // Analyze results for differences
    console.log('\nAnalysis of results:');
    const uniqueHashes = new Set(results.map(r => r.hash));
    const uniqueSizes = new Set(results.map(r => r.size));
    
    console.log(`Unique content hashes: ${uniqueHashes.size}`);
    console.log(`Unique file sizes: ${uniqueSizes.size}`);
    
    if (uniqueHashes.size > 1) {
      console.log('🚨 DIFFERENT IMAGES SERVED BASED ON USER AGENT!');
      
      // Group results by hash
      const hashGroups = {};
      results.forEach(result => {
        if (!hashGroups[result.hash]) {
          hashGroups[result.hash] = [];
        }
        hashGroups[result.hash].push(result.userAgent);
      });
      
      Object.entries(hashGroups).forEach(([hash, agents]) => {
        console.log(`  Hash ${hash}: ${agents.join(', ')}`);
      });
    } else {
      console.log('All requests returned identical images');
    }
    
    // Test with different referrers
    console.log('\n\nTesting with different referrers:');
    
    const referrers = [
      'https://imfolio.com',
      'https://replit.com',
      'http://localhost:3000',
      ''
    ];
    
    for (const referrer of referrers) {
      console.log(`\nTesting with Referrer: ${referrer || 'none'}`);
      
      try {
        const headers = {};
        if (referrer) {
          headers['Referer'] = referrer;
        }
        
        const response = await fetch(testImageUrl, { headers });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
          console.log(`  Size: ${buffer.byteLength} bytes, Hash: ${hash.substring(0, 8)}`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
    // Test with different accept headers
    console.log('\n\nTesting with different Accept headers:');
    
    const acceptHeaders = [
      'image/webp,image/apng,image/*,*/*;q=0.8',
      'image/jpeg,image/png,image/*',
      '*/*',
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    ];
    
    for (const accept of acceptHeaders) {
      console.log(`\nTesting with Accept: ${accept}`);
      
      try {
        const response = await fetch(testImageUrl, {
          headers: { 'Accept': accept }
        });
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
          console.log(`  Size: ${buffer.byteLength} bytes, Hash: ${hash.substring(0, 8)}`);
        }
      } catch (error) {
        console.log(`  Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error testing conditional serving:', error);
  }
}

testConditionalServing().then(() => {
  console.log('\nConditional serving test complete');
  process.exit(0);
}).catch(console.error);