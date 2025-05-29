/**
 * Simple, direct file migration: Move 8 files from user folder to global
 */

import { Client } from '@replit/object-storage';

const FILES_TO_MOVE = [
  '1748389850901-46dobgndwsv.jpg',
  '1748389852539-hn6djpax1z.jpg', 
  '1748389854078-ypdxzcvf0r.jpg',
  '1748389863942-oc137lj11wf.jpg',
  '1748389865629-gwd5pl3yu9.jpg',
  '1748389867271-cmlalku8ff7.jpg',
  '1748389868945-5g85fo5axv.jpg',
  '1748389881485-9bcpynccg5j.jpg',
  '1748389883270-hi8woavrrko.jpg',
  '1748389884829-piqfg5bs2ng.jpg',
  '1748389849192-2w65polvvxq.jpg'
];

async function moveFiles() {
  console.log('🚀 Starting simple file migration...');
  const client = new Client();
  
  let moved = 0;
  let errors = 0;
  
  for (const filename of FILES_TO_MOVE) {
    try {
      const sourcePath = `hero/43075889/2025/05/${filename}`;
      const targetPath = `global/hero-images/${filename}`;
      
      console.log(`📁 Moving: ${sourcePath} → ${targetPath}`);
      
      // Check if source exists
      const sourceExists = await client.exists(sourcePath);
      if (!sourceExists.ok || !sourceExists.value) {
        console.log(`⚠️ Source not found: ${sourcePath}`);
        continue;
      }
      
      // Check if target already exists
      const targetExists = await client.exists(targetPath);
      if (targetExists.ok && targetExists.value) {
        console.log(`✅ Already exists: ${targetPath}`);
        moved++;
        continue;
      }
      
      // Read source file
      const data = await client.read(sourcePath);
      if (!data.ok) {
        throw new Error(`Failed to read source: ${data.error}`);
      }
      
      // Write to target
      const upload = await client.uploadFromBytes(targetPath, data.value);
      if (!upload.ok) {
        throw new Error(`Failed to upload: ${upload.error}`);
      }
      
      console.log(`✅ Moved successfully: ${filename}`);
      moved++;
      
    } catch (error) {
      console.error(`❌ Failed to move ${filename}:`, error);
      errors++;
    }
  }
  
  console.log(`🎯 Migration complete: ${moved} moved, ${errors} errors`);
}

moveFiles().catch(console.error);