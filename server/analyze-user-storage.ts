import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

async function analyzeUserStorage() {
  const userId = '42860524';
  console.log(`🔍 Analyzing storage for user ${userId}...`);
  
  try {
    const client = new Client();
    
    // Get files from object storage in the specified folder
    const storageResult = await client.list({ prefix: `photo/${userId}/2025/05/` });
    const storageFiles = storageResult.ok ? storageResult.value : [];
    
    console.log(`\n📁 Object storage files in photo/${userId}/2025/05/:`);
    console.log(`Total files found: ${storageFiles.length}`);
    
    storageFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name}`);
    });
    
    // Get database records for this user
    const dbPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.userId, userId));
    
    console.log(`\n💾 Database photo records for user ${userId}:`);
    console.log(`Total records found: ${dbPhotos.length}`);
    
    // Filter database records that should be in the May 2025 folder
    const may2025Photos = dbPhotos.filter(photo => {
      const uploadDate = new Date(photo.createdAt);
      return uploadDate.getFullYear() === 2025 && uploadDate.getMonth() === 4; // May is month 4 (0-indexed)
    });
    
    console.log(`Records from May 2025: ${may2025Photos.length}`);
    
    may2025Photos.forEach((photo, index) => {
      console.log(`${index + 1}. ${photo.title} - ${photo.imageUrl} (${photo.createdAt})`);
    });
    
    // Cross-reference analysis
    console.log(`\n🔄 Cross-reference analysis:`);
    
    // Check if database records have corresponding files
    const missingFiles = [];
    const foundFiles = [];
    
    for (const photo of may2025Photos) {
      if (photo.imageUrl) {
        const expectedPath = photo.imageUrl.replace('/images/', '');
        const fileExists = storageFiles.some(f => f.name === expectedPath);
        
        if (fileExists) {
          foundFiles.push({ photo, path: expectedPath });
        } else {
          missingFiles.push({ photo, expectedPath });
        }
      }
    }
    
    console.log(`✅ Database records with matching files: ${foundFiles.length}`);
    foundFiles.forEach(item => {
      console.log(`  - ${item.photo.title}: ${item.path}`);
    });
    
    console.log(`❌ Database records with missing files: ${missingFiles.length}`);
    missingFiles.forEach(item => {
      console.log(`  - ${item.photo.title}: expected ${item.expectedPath}`);
    });
    
    // Check for orphaned files (files without database records)
    const dbFilePaths = new Set(may2025Photos.map(p => p.imageUrl?.replace('/images/', '')).filter(Boolean));
    const orphanedFiles = storageFiles.filter(f => !dbFilePaths.has(f.name));
    
    console.log(`🗂️ Orphaned files (in storage but not in database): ${orphanedFiles.length}`);
    orphanedFiles.forEach(file => {
      console.log(`  - ${file.name}`);
    });
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`- Storage files: ${storageFiles.length}`);
    console.log(`- Database records (May 2025): ${may2025Photos.length}`);
    console.log(`- Matched records: ${foundFiles.length}`);
    console.log(`- Missing files: ${missingFiles.length}`);
    console.log(`- Orphaned files: ${orphanedFiles.length}`);
    
    const storageEfficiency = storageFiles.length > 0 ? 
      ((storageFiles.length - orphanedFiles.length) / storageFiles.length * 100).toFixed(1) : 0;
    console.log(`- Storage efficiency: ${storageEfficiency}% (non-orphaned files)`);
    
    // Check for file size and integrity issues
    if (foundFiles.length > 0) {
      console.log(`\n🔍 File integrity check (sampling first 3 files):`);
      
      for (let i = 0; i < Math.min(3, foundFiles.length); i++) {
        const item = foundFiles[i];
        try {
          const downloadResult = await client.downloadAsBytes(item.path);
          if (downloadResult.ok) {
            const buffer = Buffer.from(downloadResult.value[0]);
            const hash = crypto.createHash('md5').update(buffer).digest('hex');
            console.log(`  - ${item.photo.title}: ${buffer.length} bytes, MD5: ${hash}`);
          } else {
            console.log(`  - ${item.photo.title}: Download failed`);
          }
        } catch (error) {
          console.log(`  - ${item.photo.title}: Error - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeUserStorage().catch(console.error);