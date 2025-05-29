// Fix storage size format inconsistency
// Convert raw byte values to KB/MB format for consistency

import { db } from './db';
import { storageUsage } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function fixStorageSizeFormat() {
  console.log('🔧 Starting storage size format standardization...');
  
  try {
    // Get all entries with numeric-only compressed_size (raw bytes)
    const entries = await db
      .select()
      .from(storageUsage)
      .where(sql`${storageUsage.compressedSize} ~ '^[0-9]+$'`);
    
    console.log(`📊 Found ${entries.length} entries with raw byte values to convert`);
    
    let convertedCount = 0;
    
    for (const entry of entries) {
      const bytes = parseInt(entry.compressedSize);
      let formattedSize: string;
      
      if (bytes >= 1024 * 1024) {
        // Convert to MB
        formattedSize = `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
      } else if (bytes >= 1024) {
        // Convert to KB
        formattedSize = `${Math.round(bytes / 1024)}KB`;
      } else {
        // Keep as bytes for very small files
        formattedSize = `${bytes}B`;
      }
      
      // Update the entry
      await db
        .update(storageUsage)
        .set({ compressedSize: formattedSize })
        .where(sql`id = ${entry.id}`);
      
      console.log(`✅ Converted entry ${entry.id}: ${bytes} bytes → ${formattedSize}`);
      convertedCount++;
    }
    
    console.log(`🎉 Successfully converted ${convertedCount} storage entries to consistent KB/MB format`);
    
    // Verify the fix
    const remainingRawBytes = await db
      .select()
      .from(storageUsage)
      .where(sql`${storageUsage.compressedSize} ~ '^[0-9]+$'`);
    
    console.log(`✅ Verification: ${remainingRawBytes.length} raw byte entries remaining`);
    
  } catch (error) {
    console.error('❌ Error fixing storage size format:', error);
  }
}

// Run the fix
fixStorageSizeFormat().then(() => {
  console.log('✨ Storage size format standardization complete');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Failed to fix storage size format:', error);
  process.exit(1);
});