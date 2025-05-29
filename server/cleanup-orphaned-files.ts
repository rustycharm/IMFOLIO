/**
 * Clean solution: Delete orphaned files in user folder and re-download fresh hero images
 */

import { Client } from '@replit/object-storage';

const ORPHANED_FILES = [
  'hero/43075889/2025/05/1748389850901-46dobgndwsv.jpg',
  'hero/43075889/2025/05/1748389852539-hn6djpax1z.jpg',
  'hero/43075889/2025/05/1748389854078-ypdxzcvf0r.jpg',
  'hero/43075889/2025/05/1748389863942-oc137lj11wf.jpg',
  'hero/43075889/2025/05/1748389865629-gwd5pl3yu9.jpg',
  'hero/43075889/2025/05/1748389867271-cmlalku8ff7.jpg',
  'hero/43075889/2025/05/1748389868945-5g85fo5axv.jpg',
  'hero/43075889/2025/05/1748389881485-9bcpynccg5j.jpg',
  'hero/43075889/2025/05/1748389883270-hi8woavrrko.jpg',
  'hero/43075889/2025/05/1748389884829-piqfg5bs2ng.jpg',
  'hero/43075889/2025/05/1748389849192-2w65polvvxq.jpg'
];

async function cleanupOrphanedFiles() {
  console.log('🧹 Cleaning up orphaned files from user folder...');
  const client = new Client();
  
  let deleted = 0;
  
  for (const filePath of ORPHANED_FILES) {
    try {
      const exists = await client.exists(filePath);
      if (exists.ok && exists.value) {
        const deleteResult = await client.delete(filePath);
        if (deleteResult.ok) {
          console.log(`🗑️ Deleted orphaned file: ${filePath}`);
          deleted++;
        } else {
          console.warn(`⚠️ Failed to delete: ${filePath}`);
        }
      } else {
        console.log(`👻 File already gone: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error deleting ${filePath}:`, error);
    }
  }
  
  console.log(`✅ Cleanup complete: ${deleted} orphaned files removed`);
}

cleanupOrphanedFiles().catch(console.error);