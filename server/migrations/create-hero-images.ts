import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function createHeroImagesTable() {
  try {
    console.log('Creating hero_images table...');
    
    // Check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'hero_images'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('hero_images table already exists, skipping creation');
      return;
    }
    
    // Create the hero_images table
    await db.execute(sql`
      CREATE TABLE "hero_images" (
        "id" TEXT PRIMARY KEY,
        "url" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "added_by" INTEGER REFERENCES "users"("id"),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('hero_images table created successfully');
    
    // Seed with initial hero images (removed problematic ones)
    await db.execute(sql`
      INSERT INTO "hero_images" ("id", "url", "name", "description", "is_active")
      VALUES 
        ('mountain-sunset', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80', 'Mountain Sunset', 'Majestic mountain peaks at sunset with golden light', true),
        ('ocean-waves', 'https://images.unsplash.com/photo-1518803194621-27188ba362c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80', 'Ocean Waves', 'Powerful ocean waves with turquoise water', true),
        ('forest-path', 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80', 'Forest Path', 'Misty forest path with sunlight streaming through trees', true),
        ('northern-lights', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80', 'Northern Lights', 'Mesmerizing aurora borealis illuminating the night sky', true)
      ON CONFLICT ("id") DO NOTHING;
    `);
    
    console.log('Added initial hero images to the database');
  } catch (error) {
    console.error('Error creating hero_images table:', error);
    throw error;
  }
}