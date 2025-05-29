
import { Client } from '@replit/object-storage';
import { db } from './db';
import { photos, heroImages } from '../shared/schema';

/**
 * Comprehensive diagnostic tool for Object Storage UI vs Reality mismatches
 * Identifies phantom folders, orphaned references, and missing files
 */
async function diagnoseStorageMismatch() {
  console.log('\n🔍 DIAGNOSING OBJECT STORAGE UI vs REALITY MISMATCH');
  console.log('=====================================================\n');

  try {
    const client = new Client();

    // 1. Get ALL actual files from Object Storage
    console.log('📡 Fetching ALL files from Object Storage...');
    const result = await client.list();
    if (!result.ok) {
      throw new Error(`Failed to list objects: ${result.error}`);
    }

    const actualFiles = result.value;
    console.log(`✅ Found ${actualFiles.length} actual files in storage\n`);

    // 2. Analyze file structure patterns
    console.log('📊 ANALYZING FILE STRUCTURE PATTERNS:');
    const patterns = new Map<string, number>();
    const userFolders = new Set<string>();
    
    actualFiles.forEach((file: any) => {
      const key = file.key || '';
      const parts = key.split('/');
      
      if (parts.length >= 3) {
        const pattern = `${parts[0]}/${parts[1]}/${parts[2]}/`;
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
        
        if (parts[0] === 'hero' && parts[1] && parts[2] && parts[3]) {
          userFolders.add(`${parts[0]}/${parts[1]}/${parts[2]}/${parts[3]}/`);
        }
      }
    });

    console.log('📁 Folder patterns found:');
    Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([pattern, count]) => {
        console.log(`   ${pattern} → ${count} files`);
      });

    // 3. Check specific problematic folder
    console.log('\n🎯 CHECKING PROBLEMATIC FOLDER: hero/43075889/2025/05/');
    const problematicFiles = actualFiles.filter((file: any) => 
      (file.key || '').startsWith('hero/43075889/2025/05/')
    );
    
    console.log(`📂 Files actually in hero/43075889/2025/05/: ${problematicFiles.length}`);
    problematicFiles.forEach((file: any) => {
      console.log(`   ✓ ${file.key}`);
    });

    // 4. Check database references for problematic paths
    console.log('\n🗄️ CHECKING DATABASE REFERENCES:');
    const heroDbRefs = await db.select().from(heroImages);
    const photoDbRefs = await db.select().from(photos);

    // Look for any orphaned references (no specific user ID hardcoded)
    const orphanedHeroRefs = [];
    const orphanedPhotoRefs = [];

    for (const hero of heroDbRefs) {
      if (hero.url) {
        const key = hero.url.replace('/images/', '');
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            orphanedHeroRefs.push(hero);
          }
        } catch (error) {
          orphanedHeroRefs.push(hero);
        }
      }
    }

    for (const photo of photoDbRefs) {
      if (photo.imageUrl) {
        const key = photo.imageUrl.replace('/images/', '');
        try {
          const exists = await client.exists(key);
          if (!exists.ok || !exists.value) {
            orphanedPhotoRefs.push(photo);
          }
        } catch (error) {
          orphanedPhotoRefs.push(photo);
        }
      }
    }

    console.log(`📊 Orphaned hero images in DB: ${orphanedHeroRefs.length}`);
    orphanedHeroRefs.forEach(h => {
      console.log(`   - ID: ${h.id}, URL: ${h.url}`);
    });

    console.log(`📊 Orphaned photos in DB: ${orphanedPhotoRefs.length}`);
    orphanedPhotoRefs.forEach(p => {
      console.log(`   - ID: ${p.id}, URL: ${p.imageUrl}`);
    });

    // 5. Test file existence for each orphaned DB reference
    console.log('\n🧪 TESTING ACTUAL FILE EXISTENCE:');
    
    for (const hero of orphanedHeroRefs) {
      if (hero.url) {
        const possibleKeys = [
          hero.url.replace('/images/', ''),
          hero.url.replace('/images/global/', 'global/'),
          hero.url.replace('/images/hero/', 'hero/')
        ];

        console.log(`\n🔍 Testing hero image "${hero.title}" (ID: ${hero.id})`);
        console.log(`   DB URL: ${hero.url}`);

        for (const key of possibleKeys) {
          if (key) {
            try {
              const exists = await client.exists(key);
              const status = exists.ok && exists.value ? '✅ EXISTS' : '❌ NOT FOUND';
              console.log(`   Test key: ${key} → ${status}`);
            } catch (error) {
              console.log(`   Test key: ${key} → ⚠️ ERROR: ${error}`);
            }
          }
        }
      }
    }

    // 6. Find all orphaned database references
    console.log('\n👻 FINDING ORPHANED DATABASE REFERENCES:');
    const allDbUrls = [
      ...heroDbRefs.map(h => h.url).filter(Boolean),
      ...photoDbRefs.map(p => p.imageUrl).filter(Boolean)
    ];

    const orphaned = [];
    for (const url of allDbUrls) {
      const possibleKey = url?.replace('/images/', '');
      if (possibleKey) {
        const actualFile = actualFiles.find((f: any) => f.key === possibleKey);
        if (!actualFile) {
          orphaned.push(url);
        }
      }
    }

    console.log(`🔥 Found ${orphaned.length} orphaned database references:`);
    orphaned.slice(0, 10).forEach(url => {
      console.log(`   - ${url}`);
    });
    if (orphaned.length > 10) {
      console.log(`   ... and ${orphaned.length - 10} more`);
    }

    // 7. Summary and recommendations
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('==================');
    console.log(`• Total files in storage: ${actualFiles.length}`);
    console.log(`• Files in hero/43075889/2025/05/: ${problematicFiles.length}`);
    console.log(`• DB references to that folder: ${heroRefsToFolder.length + photoRefsToFolder.length}`);
    console.log(`• Orphaned references found: ${orphaned.length}`);

    if (problematicFiles.length === 0 && heroRefsToFolder.length > 0) {
      console.log('\n🚨 ISSUE IDENTIFIED: UI shows folder but no files exist!');
      console.log('   The folder appears in UI due to database references to non-existent files.');
      console.log('   Recommendation: Clean up orphaned database references.');
    }

    if (problematicFiles.length > 0) {
      console.log('\n✅ Files do exist in storage - UI deletion issue may be different.');
      console.log('   This could be a UI bug or permission issue.');
    }

    return {
      actualFiles: actualFiles.length,
      problematicFolderFiles: problematicFiles.length,
      dbReferences: heroRefsToFolder.length + photoRefsToFolder.length,
      orphanedReferences: orphaned.length,
      diagnosis: problematicFiles.length === 0 ? 'phantom_folder' : 'ui_bug'
    };

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    throw error;
  }
}

// Execute diagnosis
diagnoseStorageMismatch()
  .then((results) => {
    console.log('\n🏁 Diagnosis completed successfully');
    console.log('Results:', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Diagnosis failed:', error);
    process.exit(1);
  });

export default diagnoseStorageMismatch;
