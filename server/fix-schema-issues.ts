
import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Fix database schema issues detected in error logs
 * - Rename column issues (featured vs is_featured)
 * - Check for missing username column
 */
async function fixSchemaIssues() {
  console.log('🔧 Starting schema fix process...');
  
  try {
    // Check if photos table has 'featured' column instead of 'is_featured'
    const photosColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'photos' 
      AND column_name IN ('featured', 'is_featured')
    `);
    
    const photosColumns = photosColumnsResult.rows.map(row => row.column_name);
    console.log('Photos table columns found:', photosColumns);
    
    if (photosColumns.includes('featured') && !photosColumns.includes('is_featured')) {
      console.log('⚠️ Inconsistency detected: "featured" exists but code expects "is_featured"');
      console.log('Recommended fix in storage.ts: Change query to use "featured" instead of "is_featured"');
    }
    
    // Check if photographer_profiles table has 'username' column
    const profilesColumnsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'photographer_profiles' 
      AND column_name = 'username'
    `);
    
    if (profilesColumnsResult.rows.length === 0) {
      console.log('⚠️ Missing column: "username" in photographer_profiles table');
      console.log('Recommended fix in storage.ts: Update user queries to match actual schema');
    }
    
    console.log('✅ Schema analysis complete');
    
  } catch (error) {
    console.error('❌ Schema fix process failed:', error);
  }
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  fixSchemaIssues()
    .then(() => {
      console.log('Schema check complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Schema check failed:', error);
      process.exit(1);
    });
}

export { fixSchemaIssues };
