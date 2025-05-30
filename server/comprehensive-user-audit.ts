
import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos, storageUsage } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { writeFile } from 'fs/promises';

interface ComprehensiveAuditResult {
  userId: string;
  objectStorage: {
    totalFiles: number;
    files: Array<{
      key: string;
      size?: number;
      lastModified?: string;
    }>;
  };
  storageUsageTable: {
    totalRecords: number;
    records: Array<{
      id: number;
      fileKey: string;
      originalFilename: string;
      compressedSize: string;
      imageType: string;
      operation: string;
      createdAt: string;
    }>;
  };
  photosTable: {
    totalRecords: number;
    records: Array<{
      id: number;
      title: string;
      imageUrl: string;
      fileHash: string | null;
      createdAt: string;
    }>;
  };
  crossReferenceAnalysis: {
    filesInStorageButNotInStorageUsage: string[];
    filesInStorageUsageButNotInStorage: string[];
    filesInStorageUsageButNotInPhotos: string[];
    filesInPhotosButNotInStorage: string[];
    filesInPhotosButNotInStorageUsage: string[];
    perfectMatches: Array<{
      storageKey: string;
      storageUsageId: number;
      photoId: number;
      photoTitle: string;
    }>;
  };
  discrepancies: {
    storageVsUsageTable: number;
    storageVsPhotosTable: number;
    usageTableVsPhotosTable: number;
  };
  recommendations: string[];
}

async function comprehensiveUserAudit(userId: string): Promise<ComprehensiveAuditResult> {
  console.log(`🔍 Starting comprehensive 3-way audit for user ${userId}...`);
  console.log('='.repeat(80));
  
  try {
    // 1. Get all files from object storage for this user
    console.log('📁 Step 1: Scanning object storage...');
    const client = new Client();
    const storageResult = await client.list();
    
    if (!storageResult.ok) {
      throw new Error(`Failed to list storage: ${storageResult.error}`);
    }
    
    // Filter files that belong to this user
    const userStorageFiles = storageResult.value.filter((file: any) => {
      const key = file.key || file.name || '';
      return key.includes(`/${userId}/`) || 
             key.includes(`photo/${userId}`) || 
             key.includes(`profile/${userId}`) ||
             key.startsWith(`${userId}/`) ||
             key.includes(`-${userId}-`) ||
             key.includes(`_${userId}_`) ||
             // Match patterns like: 2025/05/1748392461011-nug0ogrq3ur.jpg for user 43075889
             (key.includes('/05/') && key.includes('jpg')) ||
             (key.includes('/photo/') && key.includes(userId.slice(-4))) || // Last 4 digits
             key.includes('43075889'); // Direct user ID match
    });
    
    console.log(`   Found ${userStorageFiles.length} files in object storage`);
    
    // 2. Get all records from storage_usage table for this user
    console.log('💾 Step 2: Querying storage_usage table...');
    const storageUsageRecords = await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.userId, userId));
    
    console.log(`   Found ${storageUsageRecords.length} records in storage_usage table`);
    
    // 3. Get all records from photos table for this user
    console.log('🖼️ Step 3: Querying photos table...');
    const photoRecords = await db
      .select()
      .from(photos)
      .where(eq(photos.userId, userId));
    
    console.log(`   Found ${photoRecords.length} records in photos table`);
    
    // 4. Cross-reference analysis
    console.log('🔄 Step 4: Performing cross-reference analysis...');
    
    // Extract keys/paths for comparison
    const storageKeys = userStorageFiles.map((file: any) => file.key || file.name || '');
    const usageTableKeys = storageUsageRecords.map(record => record.fileKey);
    const photoUrls = photoRecords.map(record => record.imageUrl || '');
    const photoKeys = photoUrls.map(url => {
      // Handle different URL patterns
      let key = url.replace('/images/', '');
      if (key.startsWith('http')) {
        // Extract just the filename from full URLs
        const urlParts = key.split('/');
        key = urlParts.slice(-4).join('/'); // Get last 4 parts (user/year/month/filename)
      }
      return key;
    });
    
    // Find discrepancies
    const filesInStorageButNotInStorageUsage = storageKeys.filter(key => 
      !usageTableKeys.includes(key)
    );
    
    const filesInStorageUsageButNotInStorage = usageTableKeys.filter(key => 
      !storageKeys.includes(key)
    );
    
    const filesInStorageUsageButNotInPhotos = usageTableKeys.filter(key => 
      !photoKeys.some(photoKey => photoKey.includes(key) || key.includes(photoKey))
    );
    
    const filesInPhotosButNotInStorage = photoKeys.filter(key => 
      !storageKeys.includes(key)
    );
    
    const filesInPhotosButNotInStorageUsage = photoKeys.filter(key => 
      !usageTableKeys.some(usageKey => usageKey.includes(key) || key.includes(usageKey))
    );
    
    // Find perfect matches (files that exist in all three places)
    const perfectMatches: Array<{
      storageKey: string;
      storageUsageId: number;
      photoId: number;
      photoTitle: string;
    }> = [];
    
    for (const storageKey of storageKeys) {
      const usageRecord = storageUsageRecords.find(record => 
        record.fileKey === storageKey
      );
      
      const photoRecord = photoRecords.find(photo => {
        const photoKey = (photo.imageUrl || '').replace('/images/', '');
        return photoKey === storageKey || storageKey.includes(photoKey) || photoKey.includes(storageKey);
      });
      
      if (usageRecord && photoRecord) {
        perfectMatches.push({
          storageKey,
          storageUsageId: usageRecord.id,
          photoId: photoRecord.id,
          photoTitle: photoRecord.title || 'Untitled'
        });
      }
    }
    
    // Calculate discrepancy counts
    const discrepancies = {
      storageVsUsageTable: Math.abs(storageKeys.length - usageTableKeys.length),
      storageVsPhotosTable: Math.abs(storageKeys.length - photoKeys.length),
      usageTableVsPhotosTable: Math.abs(usageTableKeys.length - photoKeys.length)
    };
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (filesInStorageButNotInStorageUsage.length > 0) {
      recommendations.push(`${filesInStorageButNotInStorageUsage.length} files exist in storage but are not tracked in storage_usage table`);
    }
    
    if (filesInStorageUsageButNotInStorage.length > 0) {
      recommendations.push(`${filesInStorageUsageButNotInStorage.length} storage_usage records reference non-existent files`);
    }
    
    if (filesInPhotosButNotInStorage.length > 0) {
      recommendations.push(`${filesInPhotosButNotInStorage.length} photos reference missing storage files (phantom records)`);
    }
    
    if (filesInPhotosButNotInStorageUsage.length > 0) {
      recommendations.push(`${filesInPhotosButNotInStorageUsage.length} photos are not tracked in storage_usage table`);
    }
    
    if (perfectMatches.length === photoRecords.length && 
        perfectMatches.length === storageUsageRecords.length && 
        perfectMatches.length === storageKeys.length) {
      recommendations.push('✅ Perfect synchronization: All files properly tracked across all systems');
    }
    
    // Print detailed analysis
    console.log('\n📊 DETAILED CROSS-REFERENCE ANALYSIS');
    console.log('='.repeat(80));
    
    console.log(`\n🔍 OBJECT STORAGE FILES (${storageKeys.length}):`);
    storageKeys.forEach((key, i) => console.log(`  ${i + 1}. ${key}`));
    
    console.log(`\n📝 STORAGE_USAGE RECORDS (${usageTableKeys.length}):`);
    storageUsageRecords.forEach((record, i) => {
      console.log(`  ${i + 1}. ${record.fileKey} (${record.compressedSize}, ${record.imageType}, ${record.operation})`);
    });
    
    console.log(`\n🖼️ PHOTOS TABLE RECORDS (${photoKeys.length}):`);
    photoRecords.forEach((photo, i) => {
      const key = (photo.imageUrl || '').replace('/images/', '');
      console.log(`  ${i + 1}. ${key} ("${photo.title}")`);
    });
    
    console.log(`\n❌ DISCREPANCIES FOUND:`);
    if (filesInStorageButNotInStorageUsage.length > 0) {
      console.log(`\n  Files in storage but NOT in storage_usage table (${filesInStorageButNotInStorageUsage.length}):`);
      filesInStorageButNotInStorageUsage.forEach(key => console.log(`    ❌ ${key}`));
    }
    
    if (filesInStorageUsageButNotInStorage.length > 0) {
      console.log(`\n  Files in storage_usage but NOT in storage (${filesInStorageUsageButNotInStorage.length}):`);
      filesInStorageUsageButNotInStorage.forEach(key => console.log(`    ❌ ${key}`));
    }
    
    if (filesInPhotosButNotInStorage.length > 0) {
      console.log(`\n  Files in photos table but NOT in storage (${filesInPhotosButNotInStorage.length}):`);
      filesInPhotosButNotInStorage.forEach(key => console.log(`    ❌ ${key}`));
    }
    
    if (filesInPhotosButNotInStorageUsage.length > 0) {
      console.log(`\n  Files in photos table but NOT in storage_usage table (${filesInPhotosButNotInStorageUsage.length}):`);
      filesInPhotosButNotInStorageUsage.forEach(key => console.log(`    ❌ ${key}`));
    }
    
    console.log(`\n✅ PERFECT MATCHES (${perfectMatches.length}):`);
    perfectMatches.forEach(match => {
      console.log(`  ✅ ${match.storageKey} -> Photo: "${match.photoTitle}" (ID: ${match.photoId})`);
    });
    
    const auditResult: ComprehensiveAuditResult = {
      userId,
      objectStorage: {
        totalFiles: userStorageFiles.length,
        files: userStorageFiles.map((file: any) => ({
          key: file.key || file.name || '',
          size: file.size,
          lastModified: file.lastModified
        }))
      },
      storageUsageTable: {
        totalRecords: storageUsageRecords.length,
        records: storageUsageRecords.map(record => ({
          id: record.id,
          fileKey: record.fileKey,
          originalFilename: record.originalFilename || '',
          compressedSize: record.compressedSize || '',
          imageType: record.imageType || '',
          operation: record.operation || 'upload',
          createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : ''
        }))
      },
      photosTable: {
        totalRecords: photoRecords.length,
        records: photoRecords.map(photo => ({
          id: photo.id,
          title: photo.title || '',
          imageUrl: photo.imageUrl || '',
          fileHash: photo.fileHash,
          createdAt: photo.createdAt ? new Date(photo.createdAt).toISOString() : ''
        }))
      },
      crossReferenceAnalysis: {
        filesInStorageButNotInStorageUsage,
        filesInStorageUsageButNotInStorage,
        filesInStorageUsageButNotInPhotos,
        filesInPhotosButNotInStorage,
        filesInPhotosButNotInStorageUsage,
        perfectMatches
      },
      discrepancies,
      recommendations
    };
    
    console.log('\n📋 FINAL AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Object Storage Files: ${auditResult.objectStorage.totalFiles}`);
    console.log(`Storage Usage Records: ${auditResult.storageUsageTable.totalRecords}`);
    console.log(`Photos Table Records: ${auditResult.photosTable.totalRecords}`);
    console.log(`Perfect Matches: ${perfectMatches.length}`);
    console.log(`Total Discrepancies: ${Object.values(discrepancies).reduce((a, b) => a + b, 0)}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    return auditResult;
    
  } catch (error) {
    console.error('❌ Comprehensive audit failed:', error);
    throw error;
  }
}

// Execute the audit for user 43075889
async function main() {
  try {
    const auditResult = await comprehensiveUserAudit('43075889');
    
    // Write detailed results to a JSON file for further analysis
    await writeFile(
      'comprehensive-audit-43075889.json', 
      JSON.stringify(auditResult, null, 2)
    );
    
    console.log('\n✅ Comprehensive audit completed and saved to comprehensive-audit-43075889.json');
    
  } catch (error) {
    console.error('💥 Audit failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { comprehensiveUserAudit };
