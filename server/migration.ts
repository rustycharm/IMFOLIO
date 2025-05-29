import { db } from './db';
import { photos as photosTable, users as usersTable } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function migrateData() {
  console.log('Starting database migration...');

  try {
    // Step 1: Check if we have photos without user_id
    const existingPhotos = await db.select().from(photosTable);
    console.log(`Found ${existingPhotos.length} existing photos`);

    if (existingPhotos.length > 0) {
      // Step 2: Create a default user for existing photos
      console.log('Creating a default user for Russell Charman portfolio');
      const [defaultUser] = await db.insert(usersTable).values({
        username: 'russell',
        email: 'russell@example.com',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // 'secret' hashed
        firstName: 'Russell',
        lastName: 'Charman',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80',
        accountType: 'professional',
        isVerified: true
      }).returning();
      
      console.log(`Created default user with ID: ${defaultUser.id}`);

      // Step 3: Update existing photos to belong to the default user
      if (defaultUser) {
        // Use raw SQL for bulk update
        await db.execute(sql`
          UPDATE "photos" 
          SET "user_id" = ${defaultUser.id}, 
              "is_public" = true, 
              "updated_at" = NOW()
        `);
        console.log('Updated all existing photos to belong to the default user');
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateData().then(() => {
  console.log('Database migration completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('Failed to complete database migration:', error);
  process.exit(1);
});