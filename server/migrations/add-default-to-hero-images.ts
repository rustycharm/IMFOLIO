import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addDefaultToHeroImages() {
  try {
    console.log('Adding isDefault column to hero_images table...');
    
    // Check if the column already exists
    const columnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'hero_images'
        AND column_name = 'is_default'
      );
    `);
    
    if (columnExists.rows[0].exists) {
      console.log('is_default column already exists in hero_images table, skipping creation');
    } else {
      // Add the is_default column
      await db.execute(sql`
        ALTER TABLE "hero_images" 
        ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
      `);
      console.log('is_default column added to hero_images table');
      
      // Set Mountain Sunset as the default
      await db.execute(sql`
        UPDATE "hero_images"
        SET "is_default" = true
        WHERE "id" = 'mountain-sunset';
      `);
      console.log('Set Mountain Sunset as the default hero image for unauthenticated users');
    }
  } catch (error) {
    console.error('Error adding isDefault column to hero_images table:', error);
    throw error;
  }
}