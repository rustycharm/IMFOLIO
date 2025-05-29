
import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos, heroImages, userHeroSelections } from '../shared/schema';
import { eq, like } from 'drizzle-orm';

/**
 * Comprehensive Storage Audit for User Account Association
 * QA Analysis: Identifies orphaned files and misallocated storage
 */

interface StorageAuditResult {
  userId: string;
  totalFiles: number;
  allocatedFiles: string[];
  orphanedFiles: string[];
  misallocatedFiles: string[];
  storageBreakdown: {
    heroImages: number;
    userPhotos: number;
    profileImages: number;
    unclassified: number;
  };
  recommendations: string[];
}

async function auditUserStorage(targetUserId: string): Promise<StorageAuditResult> {
  console.log(`🔍 Starting storage audit for user ${targetUserId}...`);
  
  try {
    // Connect to object storage
    const client = new Client();
    
    // Get all files from storage
    const result = await client.list();
    if (!result.ok) {
      throw new Error(`Failed to list storage: ${result.error}`);
    }
    
    const allFiles = result.value;
    console.log(`📊 Found ${allFiles.length} total files in storage`);
    
    // Filter files that appear to belong to target user
    const userFiles = allFiles.filter((file: any) => {
      const key = file.key || '';
      return key.includes(`/${targetUserId}/`) || 
             key.includes(`user/${targetUserId}`) ||
             key.includes(`profile/${targetUserId}`) ||
             key.includes(`photo/${targetUserId}`) ||
             key.includes(`hero/${targetUserId}`);
    });
    
    console.log(`📁 Found ${userFiles.length} files potentially associated with user ${targetUserId}`);
    
    // Get database references for this user
    const [userPhotos, userHeroSelections, allHeroImages] = await Promise.all([
      db.select().from(photos).where(eq(photos.userId, targetUserId)),
      db.select().from(userHeroSelections).where(eq(userHeroSelections.userId, targetUserId)),
      db.select().from(heroImages)
    ]);
    
    console.log(`📊 Database records for user ${targetUserId}:`);
    console.log(`  - Photos: ${userPhotos.length}`);
    console.log(`  - Hero selections: ${userHeroSelections.length}`);
    
    // Analyze each file
    const allocatedFiles: string[] = [];
    const orphanedFiles: string[] = [];
    const misallocatedFiles: string[] = [];
    
    const storageBreakdown = {
      heroImages: 0,
      userPhotos: 0,
      profileImages: 0,
      unclassified: 0
    };
    
    for (const file of userFiles) {
      const key = file.key;
      console.log(`\n🔍 Analyzing file: ${key}`);
      
      let isAllocated = false;
      
      // Check if file is referenced in user's photos
      const photoMatch = userPhotos.find(photo => 
        photo.imageUrl?.includes(key) || 
        key.includes(photo.fileHash || 'no-hash')
      );
      
      if (photoMatch) {
        console.log(`✅ File is allocated to user photo: ${photoMatch.title}`);
        allocatedFiles.push(key);
        storageBreakdown.userPhotos++;
        isAllocated = true;
      }
      
      // Check if file is a hero image referenced by user
      const heroMatch = userHeroSelections.find(selection => {
        const heroImage = allHeroImages.find(hero => hero.id === selection.heroImageId);
        return heroImage?.url?.includes(key) || selection.customImageUrl?.includes(key);
      });
      
      if (heroMatch && !isAllocated) {
        console.log(`✅ File is allocated to user hero selection`);
        allocatedFiles.push(key);
        storageBreakdown.heroImages++;
        isAllocated = true;
      }
      
      // Check if it's a profile image (by path pattern)
      if (key.includes('profile/') && !isAllocated) {
        console.log(`✅ File appears to be user profile image`);
        allocatedFiles.push(key);
        storageBreakdown.profileImages++;
        isAllocated = true;
      }
      
      // If not allocated, check if it's misallocated
      if (!isAllocated) {
        // Check if file exists in database but for different user
        const otherUserPhoto = await db.select().from(photos).where(like(photos.imageUrl, `%${key}%`));
        
        if (otherUserPhoto.length > 0 && otherUserPhoto[0].userId !== targetUserId) {
          console.log(`❌ File is misallocated - belongs to user ${otherUserPhoto[0].userId}`);
          misallocatedFiles.push(key);
        } else {
          console.log(`❓ File is orphaned - no database reference found`);
          orphanedFiles.push(key);
          storageBreakdown.unclassified++;
        }
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (orphanedFiles.length > 0) {
      recommendations.push(`Remove ${orphanedFiles.length} orphaned files to free up storage`);
    }
    
    if (misallocatedFiles.length > 0) {
      recommendations.push(`Investigate ${misallocatedFiles.length} misallocated files - may indicate data corruption`);
    }
    
    if (orphanedFiles.length === 0 && misallocatedFiles.length === 0) {
      recommendations.push('Storage allocation is correct - all files properly associated');
    }
    
    const auditResult: StorageAuditResult = {
      userId: targetUserId,
      totalFiles: userFiles.length,
      allocatedFiles,
      orphanedFiles,
      misallocatedFiles,
      storageBreakdown,
      recommendations
    };
    
    // Print detailed report
    console.log(`\n📋 STORAGE AUDIT REPORT FOR USER ${targetUserId}`);
    console.log('='.repeat(60));
    console.log(`Total files in user's storage space: ${auditResult.totalFiles}`);
    console.log(`Properly allocated files: ${auditResult.allocatedFiles.length}`);
    console.log(`Orphaned files: ${auditResult.orphanedFiles.length}`);
    console.log(`Misallocated files: ${auditResult.misallocatedFiles.length}`);
    console.log('\nStorage breakdown:');
    console.log(`  - User photos: ${auditResult.storageBreakdown.userPhotos}`);
    console.log(`  - Hero images: ${auditResult.storageBreakdown.heroImages}`);
    console.log(`  - Profile images: ${auditResult.storageBreakdown.profileImages}`);
    console.log(`  - Unclassified: ${auditResult.storageBreakdown.unclassified}`);
    
    if (auditResult.orphanedFiles.length > 0) {
      console.log('\n❓ ORPHANED FILES:');
      auditResult.orphanedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (auditResult.misallocatedFiles.length > 0) {
      console.log('\n❌ MISALLOCATED FILES:');
      auditResult.misallocatedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    auditResult.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    return auditResult;
    
  } catch (error) {
    console.error('❌ Storage audit failed:', error);
    throw error;
  }
}

/**
 * Cross-reference user's database records with actual storage files
 */
async function crossReferenceUserData(userId: string) {
  console.log(`\n🔄 Cross-referencing database records with storage for user ${userId}...`);
  
  try {
    // Get user's database records
    const userPhotos = await db.select().from(photos).where(eq(photos.userId, userId));
    const userSelections = await db.select().from(userHeroSelections).where(eq(userHeroSelections.userId, userId));
    
    console.log(`📊 User has ${userPhotos.length} photos and ${userSelections.length} hero selections in database`);
    
    // Check each photo's storage reference
    const client = new Client();
    
    for (const photo of userPhotos) {
      if (photo.imageUrl) {
        // Extract storage key from URL
        const key = photo.imageUrl.replace('/images/', '');
        
        try {
          const exists = await client.exists(key);
          if (exists.ok && exists.value) {
            console.log(`✅ Photo "${photo.title}" has valid storage reference`);
          } else {
            console.log(`❌ Photo "${photo.title}" has broken storage reference: ${key}`);
          }
        } catch (error) {
          console.log(`⚠️ Could not verify storage for photo "${photo.title}": ${error}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Cross-reference failed:', error);
  }
}

// Main execution
async function main() {
  const targetUserId = '42860524';
  
  try {
    console.log('🚀 Starting comprehensive storage audit...\n');
    
    // Run primary audit
    const auditResult = await auditUserStorage(targetUserId);
    
    // Cross-reference database records
    await crossReferenceUserData(targetUserId);
    
    console.log('\n✅ Storage audit completed successfully');
    
    // Return structured result for potential API use
    return auditResult;
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { auditUserStorage, crossReferenceUserData };
