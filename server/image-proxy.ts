import { Request, Response } from 'express';
import { Client } from '@replit/object-storage';

// In-memory cache for frequently accessed images (small images only)
const imageCache = new Map<string, {
  data: Buffer;
  contentType: string;
  timestamp: number;
  size: number;
}>();

const CACHE_MAX_SIZE = 50 * 1024 * 1024; // 50MB cache limit
const CACHE_MAX_FILE_SIZE = 1024 * 1024; // Only cache files under 1MB
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Singleton client manager
class ImageProxyManager {
  private static instance: ImageProxyManager;
  private client: Client;
  
  private constructor() {
    this.client = new Client();
  }
  
  public static getInstance(): ImageProxyManager {
    if (!ImageProxyManager.instance) {
      ImageProxyManager.instance = new ImageProxyManager();
    }
    return ImageProxyManager.instance;
  }
  
  public getClient(): Client {
    return this.client;
  }
}

const proxyManager = ImageProxyManager.getInstance();

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now();
  let totalSize = 0;
  const toDelete: string[] = [];
  
  for (const [key, entry] of Array.from(imageCache.entries())) {
    if (now - entry.timestamp > CACHE_TTL) {
      toDelete.push(key);
    } else {
      totalSize += entry.size;
    }
  }
  
  // Remove expired entries
  toDelete.forEach(key => imageCache.delete(key));
  
  // If still over limit, remove oldest entries
  if (totalSize > CACHE_MAX_SIZE) {
    const entries = Array.from(imageCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (const [key, entry] of entries) {
      if (totalSize <= CACHE_MAX_SIZE) break;
      imageCache.delete(key);
      totalSize -= entry.size;
    }
  }
}

/**
 * Get content type from file extension with fallback
 */
function getContentTypeFromPath(path: string): string {
  const ext = path.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

/**
 * Serve images from object storage with intelligent caching and optimization
 */
export async function serveImage(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const { path } = req.params;
    
    if (!path) {
      return res.status(400).json({ error: 'Image path required' });
    }
    
    // Decode and sanitize the path
    let decodedPath = decodeURIComponent(path).replace(/\.\./g, ''); // Prevent directory traversal
    
    // Handle path mapping for hero images stored in object storage
    // Keep the full path since images are stored as "global/hero-images/..." in object storage
    
    console.log(`🔍 Image proxy: Requesting path "${path}" → mapped to "${decodedPath}"`);
    
    // Check cache first for small images
    const cacheKey = decodedPath;
    const cached = imageCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.set({
        'Content-Type': cached.contentType,
        'Content-Length': cached.size.toString(),
        'Cache-Control': 'public, max-age=86400', // 24 hours for cached content
        'X-Cache': 'HIT',
        'ETag': `"${cacheKey}-${cached.timestamp}"`,
      });
      
      console.log(`⚡ Cache hit for ${decodedPath} (${cached.size} bytes) - ${Date.now() - startTime}ms`);
      return res.send(cached.data);
    }
    
    const client = proxyManager.getClient();
    
    // Check if the file exists
    const exists = await client.exists(decodedPath);
    if (!exists.ok || !exists.value) {
      console.log(`❌ Image not found: ${decodedPath}`);
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Download the image from object storage
    console.log(`📥 Downloading image: ${decodedPath}`);
    const result = await client.downloadAsBytes(decodedPath);
    if (!result.ok) {
      throw new Error('Failed to download image from storage');
    }
    const buffer = Buffer.from(result.value[0]);
    const contentType = getContentTypeFromPath(decodedPath);
    
    // Cache small images
    if (buffer.length <= CACHE_MAX_FILE_SIZE) {
      cleanCache(); // Clean before adding new entry
      imageCache.set(cacheKey, {
        data: buffer,
        contentType,
        timestamp: Date.now(),
        size: buffer.length
      });
    }
    
    // Generate strong ETag
    const etag = `"${decodedPath}-${buffer.length}-${Date.now()}"`;
    
    // Check if client has current version
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag === etag) {
      return res.status(304).end();
    }
    
    // Set appropriate headers with security considerations
    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400, immutable', // 24 hours with immutable
      'ETag': etag,
      'X-Cache': 'MISS',
      'Vary': 'Accept-Encoding',
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });
    
    // Send the image data
    res.send(buffer);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Served image: ${decodedPath} (${buffer.length} bytes) - ${responseTime}ms`);
    
    // Log slow requests
    if (responseTime > 1000) {
      console.warn(`⚠️ Slow image response: ${decodedPath} took ${responseTime}ms`);
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Image serving failed (${responseTime}ms):`, errorMessage);
    
    // More specific error responses
    if (errorMessage.includes('does not exist')) {
      return res.status(404).json({ error: 'Image not found' });
    } else if (errorMessage.includes('access denied') || errorMessage.includes('forbidden')) {
      return res.status(403).json({ error: 'Access denied' });
    } else {
      return res.status(500).json({ error: 'Failed to serve image' });
    }
  }
}