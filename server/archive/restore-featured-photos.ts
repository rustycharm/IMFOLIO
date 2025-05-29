import { db } from './db';
import { photos, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function restoreFeaturedPhotos() {
  console.log('Restoring featured photos for admin account...');

  try {
    // Find admin user account to assign photos to
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    
    // If no admin user found, exit
    if (!adminUsers.length) {
      console.log('No admin users found. Please create an admin user first.');
      return;
    }
    
    // Use the first admin account found
    const adminUser = adminUsers[0];
    console.log(`Using admin user: ${adminUser.username} (ID: ${adminUser.id}) for featured photos`);

    // Sample featured photos to add to the admin account
    const featuredPhotos = [
      // Landscapes
      {
        title: "Mountain Majesty",
        description: "A majestic mountain range with snow-capped peaks at sunset",
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
        category: "landscapes",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 500,
          format: "jpg"
        })
      },
      {
        title: "Valley Veins",
        description: "An aerial view of winding river through a lush green valley",
        imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80",
        category: "landscapes",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 600,
          format: "jpg"
        })
      },
      
      // Portraits
      {
        title: "Natural Light",
        description: "A close-up portrait of a woman with natural lighting and soft shadows",
        imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
        category: "portraits",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 700,
          format: "jpg"
        })
      },
      {
        title: "Genuine Moment",
        description: "A candid portrait of someone laughing in natural environment",
        imageUrl: "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
        category: "portraits",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 700,
          format: "jpg"
        })
      },
      
      // Artistic
      {
        title: "Light Study",
        description: "Abstract photography with light and shadow play",
        imageUrl: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
        category: "artistic",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 500,
          format: "jpg"
        })
      },
      {
        title: "City Flow",
        description: "Long exposure night photography with light trails",
        imageUrl: "https://images.unsplash.com/photo-1520034475321-cbe63696469a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
        category: "artistic",
        featured: true,
        isPublic: true,
        userId: adminUser.id,
        sourceProvider: "unsplash",
        externalId: null,
        metadata: JSON.stringify({
          width: 600,
          height: 500,
          format: "jpg"
        })
      }
    ];
    
    // Insert photos into database
    const inserted = await db.insert(photos).values(featuredPhotos).returning();
    console.log(`Successfully added ${inserted.length} featured photos to admin account.`);
    
  } catch (error) {
    console.error('Error restoring featured photos:', error);
  }
}

// Run the restore function
restoreFeaturedPhotos().then(() => {
  console.log('Featured photos restoration complete!');
  process.exit(0);
}).catch(error => {
  console.error('Failed to restore featured photos:', error);
  process.exit(1);
});