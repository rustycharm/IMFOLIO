import { Client } from '@replit/object-storage';

/**
 * Service to resolve restored image URLs to their actual object storage paths
 * This handles the mapping between short database URLs and full storage paths
 */
export class RestoredImageResolver {
  private static instance: RestoredImageResolver;
  private client: Client;
  private pathCache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.client = new Client();
  }

  public static getInstance(): RestoredImageResolver {
    if (!RestoredImageResolver.instance) {
      RestoredImageResolver.instance = new RestoredImageResolver();
    }
    return RestoredImageResolver.instance;
  }

  /**
   * Resolve a short image URL to its full object storage path
   * @param imageUrl Short URL like "/images/1748292047561-7o3jknby17j.jpg"
   * @returns Full object storage path like "photo/43075889/2025/05/1748292047561-7o3jknby17j.jpg"
   */
  async resolveImagePath(imageUrl: string): Promise<string | null> {
    // Extract filename from URL
    const filename = imageUrl.replace('/images/', '');
    
    // Check cache first
    const cached = this.pathCache.get(filename);
    if (cached) {
      return cached;
    }

    try {
      console.log(`🔍 Searching object storage for restored image: ${filename}`);
      
      // Search for the file in object storage
      const result = await this.client.list({ prefix: 'photo/' });
      
      if (result.ok) {
        console.log(`📂 Found ${result.value.length} files in object storage`);
        
        // First, debug what properties exist
        if (result.value.length > 0) {
          console.log(`📋 First object properties:`, Object.keys(result.value[0]));
          console.log(`📋 First object sample:`, JSON.stringify(result.value[0], null, 2));
        }
        
        // Try different possible property names for the file path
        const foundFile = result.value.find((obj: any) => {
          const filePath = obj.name || obj.key || obj.path || obj.Key || obj.objectName;
          return filePath && filePath.includes(filename);
        });
        
        if (foundFile) {
          const filePath = foundFile.name || foundFile.key || foundFile.path || foundFile.Key || foundFile.objectName;
          console.log(`✅ Found restored image at: ${filePath}`);
          
          // Cache the result
          this.pathCache.set(filename, filePath);
          
          // Clean old cache entries after some time
          setTimeout(() => {
            this.pathCache.delete(filename);
          }, this.CACHE_TTL);
          
          return filePath;
        } else {
          console.log(`❌ File ${filename} not found in object storage`);
          
          // Log available files for debugging - try all possible property names
          const availableFiles = result.value
            .map((obj: any) => obj.name || obj.key || obj.path || obj.Key || obj.objectName || 'unknown')
            .filter(path => path !== 'unknown')
            .slice(0, 10); // Show first 10 files
          console.log(`📋 Sample files in storage:`, availableFiles);
        }
      } else {
        console.log(`❌ Failed to list files from object storage:`, result.error);
      }
    } catch (error) {
      console.error(`Error resolving image path for ${filename}:`, error);
    }

    return null;
  }

  /**
   * Check if an image exists in object storage by its short URL
   */
  async imageExists(imageUrl: string): Promise<boolean> {
    const fullPath = await this.resolveImagePath(imageUrl);
    if (!fullPath) return false;

    try {
      const exists = await this.client.exists(fullPath);
      return exists.ok && exists.value;
    } catch (error) {
      console.error(`Error checking image existence for ${imageUrl}:`, error);
      return false;
    }
  }

  /**
   * Get the actual file from object storage by short URL
   */
  async getImage(imageUrl: string): Promise<Buffer | null> {
    const fullPath = await this.resolveImagePath(imageUrl);
    if (!fullPath) return null;

    try {
      const result = await this.client.downloadAsBytes(fullPath);
      if (result.ok) {
        return Buffer.from(result.value[0]);
      }
    } catch (error) {
      console.error(`Error downloading image for ${imageUrl}:`, error);
    }

    return null;
  }
}