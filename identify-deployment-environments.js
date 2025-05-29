import { db } from './server/db.js';
import { heroImages } from './shared/schema.js';

async function identifyDeploymentEnvironments() {
  console.log('Identifying deployment environments and image sources...');
  
  try {
    // Check current deployment configuration
    console.log('\nCurrent Environment Configuration:');
    console.log(`REPLIT_CLUSTER: ${process.env.REPLIT_CLUSTER}`);
    console.log(`REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS}`);
    console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
    
    // Check if we're in development vs production
    const isDev = process.env.NODE_ENV !== 'production';
    console.log(`Environment: ${isDev ? 'Development' : 'Production'}`);
    
    // Analyze the current hero images for forensic evidence
    console.log('\nForensic Analysis of Current Hero Images:');
    const allHeroImages = await db.select().from(heroImages);
    
    // Look for patterns that might indicate the source
    const userAddedImages = allHeroImages.filter(img => img.addedBy === '42860524');
    const systemAddedImages = allHeroImages.filter(img => !img.addedBy || img.addedBy === null);
    
    console.log(`User-added images (May 22): ${userAddedImages.length}`);
    console.log(`System-added images (May 27): ${systemAddedImages.length}`);
    
    // Check if there are any URL patterns that might indicate different sources
    console.log('\nURL Pattern Analysis:');
    const urlPatterns = {};
    allHeroImages.forEach(img => {
      const pattern = img.url.split('/').slice(0, -1).join('/');
      if (!urlPatterns[pattern]) {
        urlPatterns[pattern] = [];
      }
      urlPatterns[pattern].push(img.name);
    });
    
    Object.entries(urlPatterns).forEach(([pattern, images]) => {
      console.log(`Pattern "${pattern}": ${images.length} images`);
    });
    
    // Check for any database configuration that might indicate multiple environments
    console.log('\nDatabase Configuration Check:');
    try {
      // Run a simple query to get database metadata
      const result = await db.execute("SELECT current_database(), current_schema(), version()");
      console.log('Database info:', result.rows[0]);
    } catch (error) {
      console.log('Could not retrieve database metadata');
    }
    
    // Look for any configuration files that might indicate multiple deployments
    console.log('\nChecking for deployment configuration files...');
    const fs = await import('fs');
    const path = await import('path');
    
    const configFiles = [
      'package.json',
      'replit.nix',
      '.replit',
      'docker-compose.yml',
      'Dockerfile'
    ];
    
    for (const file of configFiles) {
      try {
        if (fs.existsSync(file)) {
          console.log(`Found: ${file}`);
          if (file === 'package.json') {
            const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (packageJson.scripts) {
              console.log('  Scripts:', Object.keys(packageJson.scripts));
            }
          }
        }
      } catch (error) {
        // Silent skip
      }
    }
    
    // Check if there are multiple domain configurations
    console.log('\nDomain Configuration Analysis:');
    const domains = process.env.REPLIT_DOMAINS || '';
    if (domains) {
      console.log(`Configured domains: ${domains}`);
    }
    
    // Look for any hard-coded image sources in the codebase
    console.log('\nSearching for hard-coded image sources...');
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Search for any external image URLs in the codebase
      const searchResult = await execAsync('grep -r "http.*jpg\\|http.*png\\|http.*webp" --include="*.js" --include="*.ts" --include="*.json" . || true');
      if (searchResult.stdout) {
        console.log('Found external image references:');
        console.log(searchResult.stdout);
      } else {
        console.log('No external image URLs found in codebase');
      }
    } catch (error) {
      console.log('Could not search codebase for external URLs');
    }
    
  } catch (error) {
    console.error('Error identifying deployment environments:', error);
  }
}

identifyDeploymentEnvironments().then(() => {
  console.log('\nDeployment environment identification complete');
  process.exit(0);
}).catch(console.error);