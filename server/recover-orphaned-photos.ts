import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos } from '../shared/schema';
import { storage } from './storage';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface OrphanedPhoto {
  filePath: string;
  userId: string;
  filename: string;
  timestamp: number;
  estimatedTitle: string;
}

async function recoverOrphanedPhotos() {
  console.log(`🔄 STARTING ORPHANED PHOTO RECOVERY`);
  console.log('='.repeat(50));

  try {
    // Get all files from object storage
    const client = new Client();
    const result = await client.list();
    
    if (!result.ok) {
      throw new Error('Failed to access object storage');
    }

    // Filter for photo files only
    const photoFiles = result.value.filter((file: any) => {
      const name = file.name || '';
      return name.includes('photo/') && !name.includes('hero') && !name.includes('profile');
    });

    console.log(`📁 Found ${photoFiles.length} photo files in storage`);

    // Get all existing photo database records  
    const existingPhotos = await db.select().from(photos);
    const existingUrls = new Set(existingPhotos.map(p => p.imageUrl));

    console.log(`📊 Found ${existingPhotos.length} photos in database`);

    // Find orphaned files
    const orphanedFiles: OrphanedPhoto[] = [];
    
    for (const file of photoFiles) {
      const filePath = file.name;
      const expectedUrl = `/images/${filePath}`;
      
      if (!existingUrls.has(expectedUrl)) {
        // Extract user ID from file path
        const userMatch = filePath.match(/photo\/(\d+)\//);
        if (userMatch) {
          const userId = userMatch[1];
          const filename = filePath.split('/').pop() || '';
          const timestampMatch = filename.match(/^(\d+)-/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
          
          // Extract title from filename (after timestamp and random chars)
          const titleMatch = filename.match(/^\d+-[a-z0-9]+-(.+)\./i);
          const estimatedTitle = titleMatch ? 
            titleMatch[1].replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
            'Recovered Photo';

          orphanedFiles.push({
            filePath,
            userId,
            filename,
            timestamp,
            estimatedTitle
          });
        }
      }
    }

    console.log(`🔍 Found ${orphanedFiles.length} orphaned photo files`);

    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned photos found - all files are properly attributed!');
      return { recovered: 0, total: 0 };
    }

    // Group by user for better reporting
    const byUser = orphanedFiles.reduce((acc, file) => {
      if (!acc[file.userId]) acc[file.userId] = [];
      acc[file.userId].push(file);
      return acc;
    }, {} as Record<string, OrphanedPhoto[]>);

    console.log(`👥 Orphaned files found for ${Object.keys(byUser).length} users:`);
    for (const [userId, files] of Object.entries(byUser)) {
      console.log(`   User ${userId}: ${files.length} files`);
    }

    let recoveredCount = 0;

    // Process each orphaned file
    for (const orphan of orphanedFiles) {
      try {
        console.log(`\n🔄 Processing: ${orphan.filename}`);
        console.log(`   User: ${orphan.userId}`);
        console.log(`   Estimated title: ${orphan.estimatedTitle}`);

        // Verify user exists
        const user = await storage.getUser(orphan.userId);
        if (!user) {
          console.log(`   ⚠️ User ${orphan.userId} not found, skipping`);
          continue;
        }

        // Get user profile for AI enhancement
        const userProfile = await storage.getProfileByUserId(orphan.userId);
        const photographerName = userProfile 
          ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username
          : 'Photographer';

        // Generate file hash for the orphaned file
        const fileUrl = `/images/${orphan.filePath}`;
        let fileHash = null;
        try {
          const downloadResult = await client.download(orphan.filePath);
          if (downloadResult.ok) {
            const crypto = await import('crypto');
            fileHash = crypto.createHash('md5').update(downloadResult.value).digest('hex');
          }
        } catch (error) {
          console.log(`   ⚠️ Could not generate hash: ${error.message}`);
        }

        // Create database record for the orphaned photo
        const photoData = {
          userId: orphan.userId,
          title: orphan.estimatedTitle,
          description: `Recovered photo from ${new Date(orphan.timestamp).toLocaleDateString()}`,
          imageUrl: fileUrl,
          fileKey: orphan.filePath,
          fileHash,
          category: 'recovered',
          tags: ['recovered', 'archive'],
          isPublic: false, // Privacy-first for recovered photos
          featured: false,
          altText: `${orphan.estimatedTitle} - Photography by ${photographerName}`,
          keywords: 'recovered, archive, photography',
          location: '',
          sourceProvider: 'recovery',
          metadata: {
            recovered: true,
            originalTimestamp: orphan.timestamp,
            recoveryDate: new Date().toISOString()
          }
        };

        // Insert into database
        const photo = await storage.createPhoto(photoData);
        console.log(`   ✅ Created database record: Photo ID ${photo.id}`);

        // Log storage usage for tracking
        try {
          await storage.logStorageUsage({
            userId: orphan.userId,
            fileKey: orphan.filePath,
            originalFilename: orphan.filename,
            compressedSize: 'Unknown',
            imageType: 'photo'
          });
        } catch (error) {
          console.log(`   ⚠️ Could not log storage usage: ${error.message}`);
        }

        recoveredCount++;

      } catch (error) {
        console.log(`   ❌ Failed to recover ${orphan.filename}: ${error.message}`);
      }
    }

    console.log(`\n🎉 RECOVERY COMPLETED`);
    console.log(`✅ Successfully recovered: ${recoveredCount}/${orphanedFiles.length} photos`);
    console.log(`📊 Photos now properly attributed to user accounts`);

    return {
      recovered: recoveredCount,
      total: orphanedFiles.length,
      byUser: Object.entries(byUser).map(([userId, files]) => ({
        userId,
        count: files.length,
        recovered: files.filter(f => recoveredCount > 0).length
      }))
    };

  } catch (error) {
    console.error('❌ Recovery failed:', error);
    throw error;
  }
}

// Run recovery
recoverOrphanedPhotos()
  .then(result => {
    console.log('\n✅ Recovery process completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Recovery process failed:', error);
    process.exit(1);
  });