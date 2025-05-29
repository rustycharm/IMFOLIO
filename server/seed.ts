import { db } from './db';
import { photos, users, InsertPhoto } from '@shared/schema';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database with sample data...');

  // Create default user for Russell Charman
  console.log('Creating default user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const [user] = await db.insert(users).values({
    username: 'russell',
    email: 'russell.charman@example.com',
    password: passwordHash,
    firstName: 'Russell',
    lastName: 'Charman',
    profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80',
    accountType: 'professional',
    isVerified: true
  }).returning();
  
  console.log(`Created user with ID: ${user.id}`);

  // Sample photos with user ID
  const samplePhotos = [
    // Landscapes
    {
      title: "Mountain Majesty",
      description: "A majestic mountain range with snow-capped peaks at sunset",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "landscapes",
      featured: true
    },
    {
      title: "Mirror Lake",
      description: "A serene lake with perfect mountain reflections surrounded by autumn trees",
      imageUrl: "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800&q=80",
      category: "landscapes",
      featured: false
    },
    {
      title: "Coastal Drama",
      description: "A dramatic coastline with waves crashing against rugged cliffs",
      imageUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80",
      category: "landscapes",
      featured: false
    },
    {
      title: "Valley Veins",
      description: "An aerial view of winding river through a lush green valley",
      imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80",
      category: "landscapes",
      featured: true
    },
    {
      title: "Desert Gold",
      description: "A desert landscape with unique rock formations at golden hour",
      imageUrl: "https://images.unsplash.com/photo-1523978591478-c753949ff840?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
      category: "landscapes",
      featured: false
    },
    {
      title: "Forest Light",
      description: "A misty forest with sunrays filtering through tall trees",
      imageUrl: "https://images.unsplash.com/photo-1511497584788-876760111969?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "landscapes",
      featured: false
    },

    // Portraits
    {
      title: "Natural Light",
      description: "A close-up portrait of a woman with natural lighting and soft shadows",
      imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
      category: "portraits",
      featured: true
    },
    {
      title: "The Craftsman",
      description: "An environmental portrait of a craftsman in their workshop",
      imageUrl: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "portraits",
      featured: false
    },
    {
      title: "Contrast Study",
      description: "A dramatic black and white portrait with strong contrast",
      imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80",
      category: "portraits",
      featured: false
    },
    {
      title: "Genuine Moment",
      description: "A candid portrait of someone laughing in natural environment",
      imageUrl: "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
      category: "portraits",
      featured: true
    },
    {
      title: "Soft Focus",
      description: "A profile portrait with soft bokeh background",
      imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=800&q=80",
      category: "portraits",
      featured: false
    },
    {
      title: "Windows to Soul",
      description: "A close-up portrait focusing on eyes with studio lighting",
      imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "portraits",
      featured: false
    },

    // Artistic
    {
      title: "Light Study",
      description: "Abstract photography with light and shadow play",
      imageUrl: "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "artistic",
      featured: true
    },
    {
      title: "Double Vision",
      description: "Multiple exposure creative portrait",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=700&q=80",
      category: "artistic",
      featured: false
    },
    {
      title: "Nature's Geometry",
      description: "Macro photography of a natural object with unique patterns",
      imageUrl: "https://images.unsplash.com/photo-1550537687-c91072c4792d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600&q=80",
      category: "artistic",
      featured: false
    },
    {
      title: "City Flow",
      description: "Long exposure night photography with light trails",
      imageUrl: "https://images.unsplash.com/photo-1520034475321-cbe63696469a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=500&q=80",
      category: "artistic",
      featured: true
    }
  ];

  try {
    // Add user ID to each photo
    const photosWithUserId = samplePhotos.map(photo => ({
      ...photo,
      userId: user.id
    }));
    
    // Insert photos into the database
    const inserted = await db.insert(photos).values(photosWithUserId).returning();
    console.log(`Successfully seeded database with ${inserted.length} photos.`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function
seed().then(() => {
  console.log('Database seeding complete!');
  process.exit(0);
}).catch(error => {
  console.error('Failed to seed database:', error);
  process.exit(1);
});