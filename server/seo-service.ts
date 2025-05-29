import OpenAI from "openai";
import { storage } from "./storage";

// Initialize OpenAI client with validation
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not configured. SEO AI features will use fallbacks.');
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  imageAlt: string;
  structuredData: any;
}

export interface ImageSEOData {
  alt: string;
  title: string;
  description: string;
  keywords: string[];
  tags: string[];
  location?: string;
  category: string;
}

/**
 * Generate SEO metadata for photographer portfolios
 */
export async function generatePortfolioSEO(
  photographerId: string,
  photographerName?: string,
  photoCount: number = 0
): Promise<SEOMetadata> {
  try {
    const prompt = `Generate SEO metadata for a professional photography portfolio:
    
    Photographer: ${photographerName || `Photographer ${photographerId}`}
    Portfolio has ${photoCount} photos
    
    Create compelling, search-optimized content that will rank well for photography-related searches.
    Focus on professional photography, portfolio showcase, and visual storytelling.
    
    Respond with JSON in this format:
    {
      "title": "Photographer Name - Professional Photography Portfolio | IMFOLIO",
      "description": "Discover stunning photography by [name]. Professional portfolio featuring [style] photography with [number] captivating images showcasing [expertise].",
      "keywords": ["photography", "portfolio", "photographer name", "professional photos", "visual storytelling"],
      "imageAlt": "Professional photography portfolio by [name]",
      "structuredData": {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Photographer Name",
        "jobTitle": "Professional Photographer",
        "url": "https://imfolio.com/portfolio/[id]"
      }
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an SEO expert specializing in photography portfolio optimization." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });

    const seoData = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: seoData.title || `${photographerName || 'Professional'} Photography Portfolio | IMFOLIO`,
      description: seoData.description || `Explore the professional photography portfolio of ${photographerName || 'this talented photographer'} on IMFOLIO.`,
      keywords: seoData.keywords || ['photography', 'portfolio', 'professional photos'],
      imageAlt: seoData.imageAlt || `Photography portfolio by ${photographerName}`,
      structuredData: seoData.structuredData || {}
    };

  } catch (error) {
    console.error('Error generating portfolio SEO:', error);
    // Fallback SEO data
    return {
      title: `${photographerName || 'Professional'} Photography Portfolio | IMFOLIO`,
      description: `Discover stunning professional photography by ${photographerName || 'this talented photographer'}. View their complete portfolio on IMFOLIO.`,
      keywords: ['photography', 'portfolio', 'professional photographer', 'visual art'],
      imageAlt: `Professional photography portfolio`,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": photographerName || "Professional Photographer",
        "jobTitle": "Photographer"
      }
    };
  }
}

// Valid categories that match the frontend dropdown
const VALID_CATEGORIES = [
  'portrait', 'landscape', 'street', 'nature', 'architecture', 
  'travel', 'event', 'macro', 'wildlife', 'abstract', 'other'
];

/**
 * Generate comprehensive SEO metadata for images using AI
 */
export async function generateImageSEO(
  imageUrl: string,
  filename: string,
  photographerName?: string
): Promise<ImageSEOData> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this image and generate comprehensive SEO metadata:
    
    Image: ${filename}
    Photographer: ${photographerName || 'Unknown'}
    
    Create SEO-optimized metadata that will help this image rank well in image searches.
    Focus on descriptive, searchable terms that photographers and viewers would use.
    
    IMPORTANT: For category, you must choose ONE of these exact values:
    portrait, landscape, street, nature, architecture, travel, event, macro, wildlife, abstract, other
    
    Respond with JSON in this format:
    {
      "alt": "Descriptive alt text for accessibility and SEO",
      "title": "Creative and compelling title (2-3 words with no hyphens or dashes or other special characters)",
      "description": "Detailed description highlighting composition, mood, and technical aspects",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "tags": ["tag1", "tag2", "tag3"],
      "location": "Location if identifiable from image or null",
      "category": "portrait"
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "You are an expert in photography SEO and image analysis. Generate descriptive metadata that best describes the image and will help the image rank well in search engines." 
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600
    });

    const imageData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and sanitize the category
    let validatedCategory = 'other'; // Default fallback
    console.log(`🔍 Raw AI response category: "${imageData.category}" (type: ${typeof imageData.category})`);
    console.log(`🔍 Valid categories list: [${VALID_CATEGORIES.join(', ')}]`);
    
    if (imageData.category && typeof imageData.category === 'string') {
      const normalizedCategory = imageData.category.toLowerCase().trim();
      console.log(`🔍 Normalized category: "${normalizedCategory}"`);
      console.log(`🔍 Category validation: ${VALID_CATEGORIES.includes(normalizedCategory) ? 'VALID' : 'INVALID'}`);
      
      if (VALID_CATEGORIES.includes(normalizedCategory)) {
        validatedCategory = normalizedCategory;
      }
    }
    
    console.log(`🤖 AI analysis complete. Category: "${imageData.category}" → "${validatedCategory}"`);
    
    return {
      alt: imageData.alt || `Professional photograph by ${photographerName}`,
      title: imageData.title || filename.replace(/\.[^/.]+$/, ''),
      description: imageData.description || `Professional photography by ${photographerName}`,
      keywords: imageData.keywords || ['photography', 'professional photo'],
      tags: imageData.tags || ['photography'],
      location: imageData.location,
      category: validatedCategory  // Use the validated category instead of raw AI output
    };

  } catch (error) {
    console.error('Error generating image SEO:', error);
    // Fallback SEO data
    return {
      alt: `Professional photograph by ${photographerName || 'photographer'}`,
      title: filename.replace(/\.[^/.]+$/, ''),
      description: `Professional photography captured by ${photographerName || 'talented photographer'}`,
      keywords: ['photography', 'professional photo', 'visual art'],
      tags: ['photography', 'professional'],
      category: 'other'  // Use valid category from dropdown
    };
  }
}

/**
 * Generate homepage SEO for IMFOLIO platform
 */
export async function generateHomepageSEO(): Promise<SEOMetadata> {
  // Temporarily hardcode count until storage method is implemented
  const photographerCount = 2;
  
  return {
    title: "IMFOLIO | Professional Photography Portfolio Platform",
    description: `Discover stunning photography portfolios from ${photographerCount}+ professional photographers. Create your own beautiful portfolio and showcase your work on IMFOLIO.`,
    keywords: [
      'photography portfolio',
      'photographer website',
      'professional photography',
      'photo gallery',
      'portfolio platform',
      'visual storytelling',
      'photography showcase'
    ],
    imageAlt: "IMFOLIO - Professional Photography Portfolio Platform",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "IMFOLIO",
      "description": "Professional Photography Portfolio Platform",
      "url": "https://imfolio.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://imfolio.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  };
}

/**
 * Generate XML sitemap for all portfolios and images
 */
export async function generateSitemap(): Promise<string> {
  const baseUrl = "https://imfolio.com";
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <!-- Static pages -->
  <url>
    <loc>${baseUrl}/admin</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>

</urlset>`;

  return sitemap;
}