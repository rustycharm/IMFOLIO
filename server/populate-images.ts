import { storage } from "./storage";

// Beautiful photography collection for IMFOLIO platform
const photographyCollection = [
  // Landscape Photography
  {
    title: "Golden Hour Mountains",
    description: "Majestic mountain range during golden hour with dramatic lighting",
    category: "landscape",
    imageUrl: "/images/global/samples/landscape-mountains-golden.jpg",
    tags: ["landscape", "mountains", "golden hour", "nature"],
    keywords: "landscape photography, mountains, golden hour, nature, scenic",
    altText: "Majestic mountain peaks illuminated by golden hour sunlight"
  },
  {
    title: "Misty Forest Path",
    description: "Ethereal forest path shrouded in morning mist",
    category: "landscape", 
    imageUrl: "/images/global/samples/landscape-forest-mist.jpg",
    tags: ["landscape", "forest", "mist", "nature"],
    keywords: "forest photography, mist, nature, trees, atmospheric",
    altText: "Winding forest path through misty morning woods"
  },
  {
    title: "Ocean Waves at Sunset",
    description: "Powerful ocean waves crashing against rocks during sunset",
    category: "landscape",
    imageUrl: "/images/global/samples/landscape-ocean-sunset.jpg", 
    tags: ["landscape", "ocean", "sunset", "waves"],
    keywords: "ocean photography, waves, sunset, seascape, nature",
    altText: "Ocean waves crashing against rocky shore at sunset"
  },
  {
    title: "Desert Dunes",
    description: "Sweeping sand dunes with dramatic shadows",
    category: "landscape",
    imageUrl: "/images/global/samples/landscape-desert-dunes.jpg",
    tags: ["landscape", "desert", "sand dunes", "minimalist"],
    keywords: "desert photography, sand dunes, minimalist, shadows",
    altText: "Sweeping sand dunes with dramatic light and shadow"
  },
  
  // Portrait Photography - Color
  {
    title: "Natural Light Portrait",
    description: "Intimate portrait captured in beautiful natural lighting",
    category: "portrait",
    imageUrl: "/images/global/samples/portrait-natural-light.jpg",
    tags: ["portrait", "natural light", "color", "people"],
    keywords: "portrait photography, natural light, color, intimate",
    altText: "Natural light portrait with soft, beautiful lighting"
  },
  {
    title: "Urban Portrait",
    description: "Contemporary portrait in an urban environment",
    category: "portrait",
    imageUrl: "/images/global/samples/portrait-urban.jpg",
    tags: ["portrait", "urban", "contemporary", "color"],
    keywords: "urban portrait, contemporary photography, city",
    altText: "Contemporary portrait photograph in urban setting"
  },
  {
    title: "Creative Portrait Study",
    description: "Artistic portrait with creative lighting and composition",
    category: "portrait",
    imageUrl: "/images/global/samples/portrait-creative.jpg",
    tags: ["portrait", "creative", "artistic", "lighting"],
    keywords: "creative portrait, artistic photography, lighting",
    altText: "Artistic portrait with creative lighting technique"
  },
  
  // Portrait Photography - Black and White
  {
    title: "Classic B&W Portrait",
    description: "Timeless black and white portrait with dramatic contrast",
    category: "portrait",
    imageUrl: "/images/global/samples/portrait-bw-classic.jpg",
    tags: ["portrait", "black and white", "classic", "dramatic"],
    keywords: "black and white portrait, classic photography, dramatic",
    altText: "Classic black and white portrait with dramatic lighting"
  },
  {
    title: "Emotional B&W Study",
    description: "Powerful black and white portrait capturing raw emotion",
    category: "portrait",
    imageUrl: "/images/global/samples/portrait-bw-emotional.jpg",
    tags: ["portrait", "black and white", "emotional", "powerful"],
    keywords: "emotional portrait, black and white, powerful, expressive",
    altText: "Emotional black and white portrait study"
  },
  
  // Street Photography
  {
    title: "City Life Moment",
    description: "Candid moment captured on busy city street",
    category: "street",
    imageUrl: "/images/global/samples/street-city-life.jpg",
    tags: ["street", "city", "candid", "urban life"],
    keywords: "street photography, city life, candid, urban",
    altText: "Candid street photography moment in busy city"
  },
  {
    title: "Urban Shadows",
    description: "Dramatic shadows and light in urban architecture",
    category: "street",
    imageUrl: "/images/global/samples/street-shadows.jpg",
    tags: ["street", "shadows", "architecture", "dramatic"],
    keywords: "urban shadows, street photography, architecture",
    altText: "Dramatic shadows in urban street photography"
  },
  {
    title: "Night Street Scene",
    description: "Atmospheric night photography with city lights",
    category: "street",
    imageUrl: "/images/global/samples/street-night.jpg",
    tags: ["street", "night", "atmospheric", "lights"],
    keywords: "night photography, street scene, atmospheric, city lights",
    altText: "Atmospheric night street scene with city lights"
  },
  {
    title: "Rain Reflections",
    description: "Beautiful reflections on wet city streets",
    category: "street",
    imageUrl: "/images/global/samples/street-rain.jpg",
    tags: ["street", "rain", "reflections", "moody"],
    keywords: "rain photography, street reflections, moody, atmospheric",
    altText: "Rain reflections on wet city street"
  },
  
  // Moody Photography
  {
    title: "Foggy Cityscape",
    description: "Mysterious cityscape shrouded in fog",
    category: "atmospheric",
    imageUrl: "/images/global/samples/moody-foggy-city.jpg",
    tags: ["moody", "fog", "cityscape", "atmospheric"],
    keywords: "foggy cityscape, moody photography, atmospheric",
    altText: "Mysterious cityscape shrouded in fog"
  },
  {
    title: "Stormy Skies",
    description: "Dramatic storm clouds over landscape",
    category: "atmospheric",
    imageUrl: "/images/global/samples/moody-storm.jpg",
    tags: ["moody", "storm", "dramatic", "clouds"],
    keywords: "storm photography, dramatic skies, moody landscape",
    altText: "Dramatic storm clouds over landscape"
  },
  {
    title: "Blue Hour Architecture",
    description: "Modern architecture during the blue hour",
    category: "architectural",
    imageUrl: "/images/global/samples/moody-blue-hour.jpg",
    tags: ["moody", "blue hour", "architecture", "modern"],
    keywords: "blue hour photography, architecture, moody, twilight",
    altText: "Modern architecture photographed during blue hour"
  },
  {
    title: "Minimalist Seascape",
    description: "Serene minimalist seascape with calm waters",
    category: "landscape",
    imageUrl: "/images/global/samples/moody-minimal-sea.jpg",
    tags: ["moody", "minimalist", "seascape", "calm"],
    keywords: "minimalist seascape, moody photography, calm waters",
    altText: "Serene minimalist seascape with calm waters"
  },
  
  // Additional Artistic Shots
  {
    title: "Abstract Light Study",
    description: "Abstract composition with beautiful light patterns",
    category: "abstract",
    imageUrl: "/images/global/samples/abstract-light.jpg",
    tags: ["abstract", "light", "artistic", "patterns"],
    keywords: "abstract photography, light study, artistic composition",
    altText: "Abstract light patterns and artistic composition"
  },
  {
    title: "Vintage Street Corner",
    description: "Nostalgic street corner with vintage aesthetic",
    category: "street",
    imageUrl: "/images/global/samples/vintage-street.jpg",
    tags: ["vintage", "street", "nostalgic", "aesthetic"],
    keywords: "vintage photography, street corner, nostalgic, aesthetic",
    altText: "Vintage street corner with nostalgic aesthetic"
  },
  {
    title: "Golden Light Interior",
    description: "Beautiful interior space with warm golden lighting",
    category: "interior",
    imageUrl: "/images/global/samples/interior-golden.jpg",
    tags: ["interior", "golden light", "warm", "architectural"],
    keywords: "interior photography, golden light, architectural, warm",
    altText: "Interior space with beautiful warm golden lighting"
  }
];

export async function populateImages() {
  console.log("🎨 Starting image population for IMFOLIO platform...");
  
  const adminUserId = "43075889"; // Your admin user ID
  
  for (const photo of photographyCollection) {
    try {
      const newPhoto = await storage.createPhoto({
        userId: adminUserId,
        title: photo.title,
        description: photo.description,
        imageUrl: photo.imageUrl,
        category: photo.category,
        tags: photo.tags,
        keywords: photo.keywords,
        altText: photo.altText,
        isPublic: true,
        featured: true, // Set all as featured for immediate display
        location: null,
        fileKey: null,
        fileHash: null,
        sourceProvider: "curated",
        externalId: null,
        metadata: null
      });
      
      console.log(`✅ Added: ${photo.title} (ID: ${newPhoto.id})`);
    } catch (error) {
      console.error(`❌ Failed to add ${photo.title}:`, error);
    }
  }
  
  console.log("🎉 Image population completed!");
}