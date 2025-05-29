/**
 * Clean up empty folder structure from hero/43075889/2025/05/
 */

import { Client } from '@replit/object-storage';

async function cleanupEmptyFolders() {
  console.log('🧹 Cleaning up empty folder structure...');
  const client = new Client();
  
  // List all files to see what's left in the hero folder structure
  const result = await client.list();
  if (!result.ok) {
    throw new Error('Failed to list files');
  }
  
  const files = result.value;
  const heroUserFiles = files.filter((file: any) => {
    const key = (file as any).key || '';
    return key.startsWith('hero/43075889/');
  });
  
  console.log(`Found ${heroUserFiles.length} remaining files in hero/43075889/ structure`);
  
  // Delete any remaining files in the hero/43075889/ structure
  for (const file of heroUserFiles) {
    const key = (file as any).key;
    if (key) {
      try {
        const deleteResult = await client.delete(key);
        if (deleteResult.ok) {
          console.log(`🗑️ Deleted: ${key}`);
        } else {
          console.warn(`⚠️ Failed to delete: ${key}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting ${key}:`, error);
      }
    }
  }
  
  console.log('✅ Empty folder structure cleanup complete');
}

cleanupEmptyFolders().catch(console.error);