import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { db } from "./db";
import { profiles, storageUsage } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { aiRecommendationService } from "./ai-recommendations";
import multer from "multer";
import path from "path";
import { uploadImage, getStorageAnalyticsAdmin } from "./objectStorage";
import sharp from "sharp";

// Configure multer for AI analysis uploads (memory storage for temporary processing)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Admin middleware to check if user has admin role
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes - SECURITY: Only expose non-sensitive user data
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('🔍 Auth endpoint called for user:', userId);

      const user = await storage.getUser(userId);
      console.log('📝 User from auth table:', user);

      // Get profile data to merge with auth data
      const profile = await storage.getProfile(userId);
      console.log('👤 Profile from profiles table:', profile);

      // Partially obfuscate email for security while maintaining user confidence
      const obfuscateEmail = (email: string | null) => {
        if (!email) return null;
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
        return `${localPart.substring(0, 2)}***@${domain}`;
      };

      const safeUserData = {
        id: user?.id, // Replit user ID (primary key) - not customizable
        role: user?.role,
        emailPartial: obfuscateEmail(user?.email || null), // Partially obfuscated for security
        profileImageUrl: user?.profileImageUrl, // Profile picture from auth table
        // Profile-customizable fields - ONLY from profile table
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        username: profile?.username, // User-chosen username (separate from ID)
        tagline: profile?.tagline,
        bio: profile?.bio,
        website: profile?.website,
        instagram: profile?.instagram,
        facebook: profile?.facebook,
        twitter: profile?.twitter,
        portfolioUrlType: profile?.portfolioUrlType,
        isPublic: profile?.isPublic,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt
      };

      console.log('✅ Sending secure user data (PII excluded)');
      res.json(safeUserData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User Profile Management - separate from Replit Auth for customizable data
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/profile', async (req: any, res) => {
    console.log('🔥 PUT /api/profile - REQUEST RECEIVED!');

    // Manual auth check - same logic as other working endpoints
    if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
      console.log('🔥 PUT /api/profile - Authentication failed');
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('🔥 PUT /api/profile - User authenticated:', req.user.claims.sub);
    try {
      const userId = req.user.claims.sub;
      console.log('🔥 PUT /api/profile - RAW REQUEST BODY:', JSON.stringify(req.body, null, 2));

      const { username, firstName, lastName, tagline, bio, portfolioUrlType } = req.body;

      console.log('🔥 PUT /api/profile - Extracted fields:', { 
        username, 
        firstName, 
        lastName, 
        tagline, 
        bio, 
        portfolioUrlType,
        portfolioUrlTypeType: typeof portfolioUrlType 
      });

      // Use Drizzle schema property names (camelCase), not database column names
      const profileData = {
        username,
        firstName,
        lastName,
        tagline,
        bio,
        portfolioUrlType
      };

      console.log('🔥 PUT /api/profile - Data being sent to storage:', JSON.stringify(profileData, null, 2));

      const updatedProfile = await storage.updateProfile(userId, profileData);

      console.log('🔥 PUT /api/profile - Profile after update:', JSON.stringify(updatedProfile, null, 2));
      res.json(updatedProfile);
    } catch (error) {
      console.error("🔥 Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Photos endpoints - PUBLIC ONLY for unauthenticated users
  app.get("/api/photos", async (req, res) => {
    try {
      const { featured, category } = req.query;

      console.log(`📸 Photo request - featured: ${featured} (type: ${typeof featured}), category: ${category}`);

      // Only serve public photos to unauthenticated users
      const photos = await storage.getPublicPhotos({
        featured: featured === 'true',
        category: category as string
      });

      console.log(`📸 Serving ${photos.length} public photos (featured filter: ${featured === 'true'})`);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Get user's own photos (all - private and public)
  app.get("/api/user/photos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photos = await storage.getPhotosByUser(userId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching user photos:", error);
      res.status(500).json({ message: "Failed to fetch user photos" });
    }
  });

  // Get photo statistics for current user
  app.get("/api/photos/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photos = await storage.getPhotosByUser(userId);

      // Calculate statistics
      const totalPhotos = photos.length;
      const sharedPhotos = photos.filter(p => p.isPublic).length;
      const featuredPhotos = photos.filter(p => p.featured).length;
      const categories = [...new Set(photos.map(p => p.category).filter(Boolean))].length;

      // Get last upload date
      const lastUploadDate = photos.length > 0 
        ? photos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null;

      // Get storage usage
      const { getUserStorageUsage } = await import('./storage-tracking');
      const storageUsage = await getUserStorageUsage(userId);

      res.json({
        totalPhotos,
        sharedPhotos,
        featuredPhotos,
        categories,
        albums: 0, // Albums not implemented yet
        lastUploadDate,
        totalStorageUsed: storageUsage.totalBytes || 0,
        storageQuota: 100 * 1024 * 1024, // 100MB default quota
      });
    } catch (error) {
      console.error("Error fetching photo stats:", error);
      res.status(500).json({ message: "Failed to fetch photo statistics" });
    }
  });

  // Get user's storage usage with quota information
  app.get("/api/user/storage-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { getUserStorageUsage } = await import('./storage-tracking');
      const storageUsage = await getUserStorageUsage(userId);
      
      const quotaBytes = 250 * 1024 * 1024; // 250MB in bytes
      const usagePercentage = Math.round((storageUsage.totalBytes / quotaBytes) * 100);
      
      // Helper function to format bytes
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };
      
      res.json({
        usedBytes: storageUsage.totalBytes,
        usedFormatted: storageUsage.formattedSize,
        quotaBytes: quotaBytes,
        quotaFormatted: "250 MB",
        usagePercentage: Math.min(usagePercentage, 100),
        totalFiles: storageUsage.totalFiles,
        remainingBytes: Math.max(quotaBytes - storageUsage.totalBytes, 0),
        remainingFormatted: formatBytes(Math.max(quotaBytes - storageUsage.totalBytes, 0))
      });
    } catch (error) {
      console.error("Error fetching storage usage:", error);
      // Return safe defaults for 250MB quota
      res.json({
        usedBytes: 0,
        usedFormatted: "0 MB",
        quotaBytes: 250 * 1024 * 1024,
        quotaFormatted: "250 MB",
        usagePercentage: 0,
        totalFiles: 0,
        remainingBytes: 250 * 1024 * 1024,
        remainingFormatted: "250 MB"
      });
    }
  });

  // Update photo visibility
  app.post("/api/user/photos/:id/public", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);
      const { isPublic } = req.body;

      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ message: 'isPublic must be a boolean' });
      }

      // Update the photo visibility
      const updatedPhoto = await storage.updatePhotoVisibility(photoId, userId, isPublic);

      if (!updatedPhoto) {
        return res.status(404).json({ message: 'Photo not found or not owned by user' });
      }

      console.log(`Photo ${photoId} visibility updated to ${isPublic ? 'public' : 'private'} for user ${userId}`);

      res.json({
        success: true,
        photo: updatedPhoto,
        message: `Photo is now ${isPublic ? 'public' : 'private'}`
      });
    } catch (error) {
      console.error('Photo visibility update error:', error);
      res.status(500).json({ message: 'Failed to update photo visibility' });
    }
  });

  // Delete user photo
  app.delete("/api/user/photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);

      if (isNaN(photoId)) {
        return res.status(400).json({ message: 'Invalid photo ID' });
      }

      // Get the photo first to verify ownership and get the file path
      const photos = await storage.getPhotosByUser(userId);
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found or not owned by user' });
      }

      // Extract the storage key from the image URL
      // URL format: /images/photo/userId/year/month/filename
      let storageKey = null;
      if (photo.imageUrl && photo.imageUrl.startsWith('/images/')) {
        storageKey = photo.imageUrl.replace('/images/', '');
      }

      // Delete from database first
      const deleted = await storage.deletePhoto(photoId);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete photo from database' });
      }

      // Delete from object storage if we have the key
      if (storageKey) {
        try {
          const { Client } = await import('@replit/object-storage');
          const client = new Client();
          
          const deleteResult = await client.delete(storageKey);
          if (deleteResult.ok) {
            console.log(`✅ Deleted file from storage: ${storageKey}`);
          } else {
            console.warn(`⚠️ Failed to delete file from storage: ${storageKey}`, deleteResult.error);
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError);
          // Don't fail the request if storage deletion fails - database cleanup succeeded
        }
      }

      console.log(`🗑️ Photo ${photoId} deleted successfully for user ${userId}`);

      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      console.error('Photo deletion error:', error);
      res.status(500).json({ message: 'Failed to delete photo' });
    }
  });

  // Update photo metadata
  app.patch("/api/user/photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);
      const { title, description, category, tags } = req.body;

      console.log(`📝 Updating photo ${photoId} metadata:`, { title, description, category, tags });

      // Verify ownership
      const photos = await storage.getPhotosByUser(userId);
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Update photo metadata
      await storage.updatePhotoMetadata(photoId, {
        title,
        description,
        category,
        tags
      });

      console.log(`✅ Photo ${photoId} metadata updated successfully`);
      res.json({ message: 'Photo updated successfully' });
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ message: 'Failed to update photo' });
    }
  });

  // Update photo featured status
  app.post("/api/user/photos/:id/featured", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);
      const { featured } = req.body;

      console.log(`⭐ Updating photo ${photoId} featured status to:`, featured);

      // Verify ownership
      const photos = await storage.getPhotosByUser(userId);
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Update photo featured status
      await storage.updatePhotoFeatured(photoId, featured);

      console.log(`✅ Photo ${photoId} featured status updated to: ${featured}`);
      res.json({ message: 'Photo featured status updated successfully' });
    } catch (error) {
      console.error("Error updating photo featured status:", error);
      res.status(500).json({ message: 'Failed to update featured status' });
    }
  });

  // Update photo public status
  app.post("/api/user/photos/:id/public", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);
      const { isPublic } = req.body;

      console.log(`🔒 Updating photo ${photoId} public status to:`, isPublic);

      // Verify ownership
      const photos = await storage.getPhotosByUser(userId);
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Update photo public status
      await storage.updatePhotoPublicStatus(photoId, isPublic);

      console.log(`✅ Photo ${photoId} public status updated to: ${isPublic}`);
      res.json({ message: 'Photo public status updated successfully' });
    } catch (error) {
      console.error("Error updating photo public status:", error);
      res.status(500).json({ message: 'Failed to update public status' });
    }
  });

  // AI analysis endpoint for real-time suggestions during upload
  app.post("/api/photos/ai-analyze", isAuthenticated, upload.single('image'), async (req: any, res) => {
    console.log('🚀 AI Analysis endpoint hit');
    console.log('📋 Request details:', {
      userId: req.user?.claims?.sub,
      hasFile: !!req.file,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      filename: req.file?.originalname
    });

    try {
      const userId = req.user.claims.sub;

      if (!req.file) {
        console.error('❌ No image file provided');
        return res.status(400).json({ message: 'No image provided for analysis' });
      }

      console.log('👤 Getting user profile for photographer name...');
      const userProfile = await storage.getProfileByUserId(userId);
      const photographerName = userProfile 
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username
        : 'Professional Photographer';

      console.log(`📸 Photographer name: ${photographerName}`);

      try {
        const { generateImageSEO } = await import('./seo-service');
        console.log(`🤖 Starting AI analysis for image: ${req.file.originalname}`);
        console.log(`📊 Image size: ${(req.file.size / 1024).toFixed(1)}KB`);

        // Create temporary image URL for analysis (we won't save this)
        const tempImageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        console.log('🔄 Created base64 data URL for AI analysis');

        const aiMetadata = await generateImageSEO(tempImageData, req.file.originalname, photographerName);

        console.log(`✨ AI analysis complete!`);
        console.log('📝 Generated metadata:', {
          title: aiMetadata.title,
          category: aiMetadata.category,
          hasDescription: !!aiMetadata.description,
          tagCount: aiMetadata.tags?.length || 0,
          keywordCount: aiMetadata.keywords?.length || 0,
          location: aiMetadata.location
        });

        res.json({
          success: true,
          suggestions: {
            title: aiMetadata.title,
            description: aiMetadata.description,
            category: aiMetadata.category,
            tags: aiMetadata.tags,
            location: aiMetadata.location,
            altText: aiMetadata.alt,
            keywords: aiMetadata.keywords
          }
        });

        console.log('✅ AI suggestions sent to client');
      } catch (aiError: any) {
        console.error('❌ AI analysis failed:', aiError.message);
        console.error('🔍 AI Error details:', aiError);
        res.status(500).json({ 
          message: 'AI analysis temporarily unavailable',
          error: aiError.message 
        });
      }
    } catch (error: any) {
      console.error('💥 General AI analysis error:', error);
      res.status(500).json({ message: 'Failed to analyze image' });
    }
  });

  // Generate AI suggestions for existing photo
  app.post("/api/user/photos/:id/ai-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const photoId = parseInt(req.params.id);

      // Get the photo to analyze
      const photos = await storage.getPhotosByUser(userId);
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        return res.status(404).json({ message: 'Photo not found or not owned by user' });
      }

      // Get user profile for photographer name
      const userProfile = await storage.getProfileByUserId(userId);
      const photographerName = userProfile 
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username
        : 'Professional Photographer';

      try {
        const { generateImageSEO } = await import('./seo-service');
        console.log(`🤖 Generating AI suggestions for photo: ${photo.title}`);

        const aiMetadata = await generateImageSEO(photo.imageUrl, photo.title, photographerName);

        console.log(`✨ AI suggestions generated for ${photo.title}`);

        res.json({
          success: true,
          suggestions: {
            title: aiMetadata.title,
            description: aiMetadata.description,
            category: aiMetadata.category,
            tags: aiMetadata.tags,
            location: aiMetadata.location,
            altText: aiMetadata.alt,
            keywords: aiMetadata.keywords
          },
          message: 'AI suggestions generated successfully'
        });
      } catch (aiError: any) {
        console.warn('AI suggestion generation failed:', aiError.message);
        res.status(500).json({ 
          message: 'Failed to generate AI suggestions',
          error: aiError.message 
        });
      }
    } catch (error: any) {
      console.error('AI suggestion error:', error);
      res.status(500).json({ message: 'Failed to generate AI suggestions' });
    }
  });

  // Photo upload uses the same multer configuration as AI analysis

  // Photo upload endpoint
  app.post("/api/photos/upload", isAuthenticated, upload.single('image'), async (req: any, res) => {
    const userId = req.user.claims.sub;
    console.log(`🚀 PHOTO UPLOAD STARTED for user ${userId}`);
    console.log(`📝 Request body:`, {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description?.substring(0, 50) + '...',
      imageType: req.body.imageType
    });
    
    try {
      // Step 1: File validation
      if (!req.file) {
        console.error(`❌ UPLOAD FAILED - No file uploaded for user ${userId}`);
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log(`📁 File received:`, {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: `${(req.file.size / 1024).toFixed(1)}KB`,
        bufferLength: req.file.buffer.length
      });

      // Step 2: Generate file hash to check for duplicates
      console.log(`🔍 Generating file hash for duplicate check...`);
      const crypto = await import('crypto');
      const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
      console.log(`🔐 File hash generated: ${fileHash}`);

      // Step 3: Check for duplicates
      console.log(`🔍 Checking for existing photo with same hash...`);
      const existingPhoto = await storage.getPhotoByHash(userId, fileHash);
      if (existingPhoto) {
        console.log(`⚠️ DUPLICATE DETECTED - Photo already exists: ID ${existingPhoto.id}`);
        return res.status(409).json({ 
          message: 'This image has already been uploaded to your portfolio.',
          existingPhoto: {
            id: existingPhoto.id,
            title: existingPhoto.title
          }
        });
      }
      console.log(`✅ No duplicate found, proceeding with upload`);

      // Step 4: Validate required fields
      const { title, category, description } = req.body;
      console.log(`📋 Form validation:`, {
        hasTitle: !!title,
        hasCategory: !!category,
        hasDescription: !!description
      });

      if (!title || !category) {
        console.error(`❌ UPLOAD FAILED - Missing required fields: title=${!!title}, category=${!!category}`);
        return res.status(400).json({ message: 'Title and category are required' });
      }

      try {
        // Step 5: Import object storage utility
        console.log(`📦 Importing object storage utility...`);
        const { uploadImageToStorage } = await import('./objectStorage');

        // Step 6: Generate unique filename
        const timestamp = Date.now();
        const fileExtension = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `${userId}/${timestamp}-${title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
        console.log(`📝 Generated filename: ${filename}`);

        // Step 7: Upload to object storage
        console.log(`☁️ Starting upload to object storage...`);
        console.log(`📊 Upload details:`, {
          filename,
          bufferSize: req.file.buffer.length,
          originalName: req.file.originalname
        });
        
        const uploadResult = await uploadImageToStorage(req.file.buffer, filename);
        console.log(`✅ Upload to object storage successful:`, {
          url: uploadResult.url,
          key: uploadResult.key,
          size: uploadResult.size
        });

        // Step 8: Calculate compressed size for tracking
        const compressedSizeKB = Math.round(req.file.size / 1024);
        const compressedSize = compressedSizeKB < 1024 
          ? `${compressedSizeKB}KB` 
          : `${(compressedSizeKB / 1024).toFixed(1)}MB`;
        console.log(`📏 Calculated file size: ${compressedSize}`);

          // Get user profile for photographer name (for AI metadata)
          const userProfile = await storage.getProfileByUserId(userId);
          const photographerName = userProfile 
            ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username
            : 'Professional Photographer';

          // Generate AI-powered metadata for better SEO and discovery
          let aiMetadata = null;
          try {
            const { generateImageSEO } = await import('./seo-service');
            console.log(`🤖 Generating AI metadata for photo: ${title}`);

            // Use base64 data URL for AI analysis (same as working AI endpoint)
            const tempImageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            aiMetadata = await generateImageSEO(tempImageData, req.file.originalname, photographerName);

            console.log(`✨ AI metadata generated successfully for ${title}`);
          } catch (aiError) {
            console.warn('AI metadata generation failed, using manual metadata:', aiError.message);
          }

          // Use AI-enhanced description if available, otherwise fallback to user input
          const finalDescription = aiMetadata?.description || description || '';
          const finalTags = aiMetadata?.tags || [];
          const finalLocation = aiMetadata?.location || '';

          // Step 10: Create photo record in database with AI-enhanced metadata
          console.log(`💾 Creating database record...`);
          const photoData = {
            userId,
            title: aiMetadata?.title || title,
            category: aiMetadata?.category || category || 'uncategorized',
            description: finalDescription,
            imageUrl: uploadResult.url,
            fileKey: uploadResult.key,
            fileHash, // Include file hash for duplicate prevention
            isPublic: false, // Privacy-first default
            featured: false,
            // Store AI metadata for future use
            tags: finalTags,
            location: finalLocation,
            altText: aiMetadata?.alt || `Photography by ${photographerName}`,
            keywords: aiMetadata?.keywords ? aiMetadata.keywords.join(', ') : ''
          };

          console.log(`📋 Photo data for database:`, {
            userId: photoData.userId,
            title: photoData.title,
            category: photoData.category,
            imageUrl: photoData.imageUrl,
            fileKey: photoData.fileKey,
            isPublic: photoData.isPublic,
            hasFileHash: !!photoData.fileHash
          });

          const photo = await storage.createPhoto(photoData);
          console.log(`✅ Database record created successfully: Photo ID ${photo.id}`);

          // Step 11: Log storage usage for admin metrics
          console.log(`📊 Logging storage usage metrics...`);
          await storage.logStorageUsage({
            userId,
            fileKey: uploadResult.key,
            originalFilename: req.file.originalname,
            compressedSize,
            imageType: 'photo'
          });
          console.log(`✅ Storage usage logged successfully`);

          console.log(`🎉 PHOTO UPLOAD COMPLETED SUCCESSFULLY: Photo ID ${photo.id} for user ${userId}`);

          res.json({
            success: true,
            photo: {
              ...photo,
              aiEnhanced: !!aiMetadata
            },
            aiMetadata: aiMetadata || null,
            message: aiMetadata 
              ? 'Photo uploaded successfully with AI-enhanced metadata!' 
              : 'Photo uploaded successfully'
          });

      } catch (uploadError) {
        console.error('Upload processing error:', uploadError);
        res.status(500).json({ message: 'Failed to process upload' });
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Hero images endpoint
  app.get("/api/hero-images/default", async (req, res) => {
    try {
      const defaultHero = await storage.getDefaultHeroImage();

      if (defaultHero) {
        const imageUrl = defaultHero.imageUrl || defaultHero.url || `/images/global/hero-images/${defaultHero.id}.jpg`;
        res.json({
          id: defaultHero.id,
          url: imageUrl,
          title: defaultHero.title || defaultHero.name,
          name: defaultHero.name,
          description: defaultHero.description
        });
      } else {
        res.json({ id: null, url: null, title: null });
      }
    } catch (error) {
      console.error("Error fetching default hero image:", error);
      res.status(500).json({ message: "Failed to fetch default hero image" });
    }
  });

  // Messages endpoint
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Helper function to generate portfolio URL based on user preference
  function generatePortfolioUrl(profile: any): string {
    console.log('🔥 generatePortfolioUrl called with:', JSON.stringify(profile, null, 2));

    switch (profile.portfolioUrlType) {
      case 'username':
        return profile.username || profile.userId;
      case 'fullname_dash':
        const firstName = (profile.firstName || '').trim();
        const lastName = (profile.lastName || '').trim();
        if (firstName && lastName) {
          // Format: "john-doe" (lowercase, single dash)
          const url = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
          console.log('🔥 Generated fullname_dash URL:', url);
          return url;
        }
        return profile.userId;
      case 'fullname_dot':
        const firstNameDot = (profile.firstName || '').trim();
        const lastNameDot = (profile.lastName || '').trim();
        if (firstNameDot && lastNameDot) {
          // Format: "john.doe" (lowercase, period)
          const url = `${firstNameDot}.${lastNameDot}`.toLowerCase().replace(/[^a-z0-9.]/g, '');
          console.log('🔥 Generated fullname_dot URL:', url);
          return url;
        }
        return profile.userId;
      case 'id':
      default:
        return profile.userId;
    }
  }

  // Helper function to find profile by various URL formats
  async function findProfileByUrl(identifier: string): Promise<{ profile: any, authUser: any } | null> {
    console.log('🔍 Looking for profile with identifier:', identifier);

    try {
      // Method 1: Try direct database query for username
      console.log('🔍 Method 1: Checking username match');
      const [userProfile] = await db.select().from(profiles).where(eq(profiles.username, identifier));

      if (userProfile) {
        console.log('✅ Found profile by username:', userProfile);
        const authUser = await storage.getUser(userProfile.userId);
        if (authUser) {
          console.log('✅ Found corresponding auth user:', authUser);
          return { profile: userProfile, authUser };
        }
      }
      console.log('❌ No username match found');

      console.log('🔍 Method 2: Trying name-based matching');

      // Get all profiles to search through them
      const allProfiles = await db.select().from(profiles);
      console.log(`🔍 Found ${allProfiles.length} profiles to check`);

      for (const profile of allProfiles) {
        console.log(`🔍 Checking profile: ${profile.firstName} ${profile.lastName} (${profile.portfolioUrlType})`);

        // Handle fullname_dot format (like captain.kirk)
        if (profile.portfolioUrlType === 'fullname_dot' && identifier.includes('.')) {
          const [searchFirst, searchLast] = identifier.split('.');
          const profileFirst = (profile.firstName || '').toLowerCase();
          const profileLast = (profile.lastName || '').toLowerCase();
          const searchFirstLower = searchFirst.toLowerCase();
          const searchLastLower = searchLast.toLowerCase();

          console.log(`🔍 Comparing: "${searchFirstLower}.${searchLastLower}" vs "${profileFirst}.${profileLast}"`);

          if (profileFirst === searchFirstLower && profileLast === searchLastLower) {
            console.log('✅ Found matching profile via fullname_dot!');
            const authUser = await storage.getUser(profile.userId);
            if (authUser) {
              return { profile, authUser };
            }
          }
        }

        // Handle fullname_dash format (like captain-kirk)
        if (profile.portfolioUrlType === 'fullname_dash' && identifier.includes('-')) {
          const [searchFirst, searchLast] = identifier.split('-');
          const profileFirst = (profile.firstName || '').toLowerCase();
          const profileLast = (profile.lastName || '').toLowerCase();
          const searchFirstLower = searchFirst.toLowerCase();
          const searchLastLower = searchLast.toLowerCase();

          if (profileFirst === searchFirstLower && profileLast === searchLastLower) {
            console.log('✅ Found matching profile via fullname_dash!');
            const authUser = await storage.getUser(profile.userId);
            if (authUser) {
              return { profile, authUser };
            }
          }
        }
      }

      // Method 2: Try by name formats (dash or dot) - case insensitive
      console.log('🔍 Method 2: Checking name format (dash/dot)');
      console.log('🔍 Identifier contains dash:', identifier.includes('-'));
      console.log('🔍 Identifier contains dot:', identifier.includes('.'));

      if (identifier.includes('-') || identifier.includes('.')) {
        console.log('🔍 Method 2: Found separator, proceeding with name match');
        const separator = identifier.includes('-') ? '-' : '.';
        const [searchFirstName, searchLastName] = identifier.split(separator);

        if (searchFirstName && searchLastName) {
          console.log(`🔍 Searching for: "${searchFirstName}" . "${searchLastName}"`);

          // Get all profiles and do case-insensitive comparison
          const allProfiles = await db.select().from(profiles);
          console.log(`🔍 Total profiles to check: ${allProfiles.length}`);

          for (const profile of allProfiles) {
            const profileFirstName = (profile.firstName || '').toLowerCase();
            const profileLastName = (profile.lastName || '').toLowerCase();
            const searchFirst = searchFirstName.toLowerCase();
            const searchLast = searchLastName.toLowerCase();

            console.log(`🔍 Comparing "${searchFirst}" vs "${profileFirstName}" and "${searchLast}" vs "${profileLastName}"`);

            if (profileFirstName === searchFirst && profileLastName === searchLast) {
              const authUser = await storage.getUser(profile.userId);
              if (authUser) {
                console.log('✅ Found profile by case-insensitive name match:', profile);
                return { profile, authUser };
              }
            }
          }
          console.log('❌ No matching profile found after checking all profiles');
        }
      }

      // Method 3: Try by Replit user ID
      const authUser = await storage.getUser(identifier);
      if (authUser) {
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, authUser.id));
        if (profile) {
          return { profile, authUser };
        }
      }

      console.log('No profile found for identifier:', identifier);
      return null;
    } catch (error) {
      console.error('🚨 Error in findProfileByUrl:', error);
      console.error('🚨 Error details:', error.message);
      console.error('🚨 Stack trace:', error.stack);
      return null;
    }
  }

  // Public portfolio endpoint - no authentication required
  app.get("/api/portfolio/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;

      console.log('Portfolio lookup for identifier:', identifier);

      const result = await findProfileByUrl(identifier);

      if (!result) {
        console.log('Portfolio not found for identifier:', identifier);
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const { profile: userProfile, authUser } = result;
      console.log('Found profile:', userProfile);
      console.log('Found auth user:', authUser);

      // Return public profile data combining both sources
      const profile = {
        id: authUser.id, // Use Replit ID as primary identifier
        username: userProfile.username || authUser.id,
        firstName: userProfile.firstName || authUser.firstName || '',
        lastName: userProfile.lastName || authUser.lastName || '',
        profileImage: authUser.profileImageUrl || null,
        heroImage: '', // Will be handled by hero images endpoint
        tagline: userProfile.tagline || '',
        aboutMe: userProfile.bio || '',
        email: authUser.email,
        instagram: userProfile.instagram,
        twitter: userProfile.twitter,
        website: userProfile.website,
        portfolioUrl: generatePortfolioUrl(userProfile) // Include the generated URL
      };

      res.json(profile);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // Public portfolio photos endpoint - no authentication required
  app.get("/api/portfolio/:identifier/photos", async (req, res) => {
    try {
      const { identifier } = req.params;

      console.log('Portfolio photos lookup for identifier:', identifier);

      const result = await findProfileByUrl(identifier);

      if (!result) {
        console.log('Portfolio not found for photos:', identifier);
        return res.status(404).json({ message: "Portfolio not found" });
      }

      const { authUser } = result;
      console.log('Found user for photos:', authUser.id);

      // Get PUBLIC photos only for portfolio display
      const allPhotos = await storage.getPhotosByUserId(authUser.id);
      const publicPhotos = allPhotos.filter(photo => photo.isPublic === true);
      console.log(`Photos found for user: ${allPhotos.length}, public: ${publicPhotos.length}`);
      res.json(publicPhotos);
    } catch (error) {
      console.error("Error fetching portfolio photos:", error);
      res.status(500).json({ message: "Failed to fetch portfolio photos" });
    }
  });

  // Color palette extraction route - Extract colors from a specific hero image
  app.post("/api/hero-images/:id/extract-colors", isAuthenticated, async (req: any, res) => {
    try {
      const heroImageId = req.params.id;
      const heroImage = await storage.getHeroImageById(heroImageId);

      if (!heroImage) {
        return res.status(404).json({ message: "Hero image not found" });
      }

      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log(`Extracting colors for hero image: ${heroImageId} - ${heroImage.url}`);

      // Import the color extractor
      const { ColorExtractor } = await import('./colorExtraction');

      // Extract colors from the hero image
      const colorPalette = await ColorExtractor.extractColors(heroImage.url || heroImage.imageUrl || '');

      // Update the hero image with color data
      await storage.updateHeroImageColors(heroImageId, {
        dominantColor: colorPalette.dominantColor,
        colorPalette: colorPalette
      });

      console.log(`Color extraction completed for ${heroImageId}:`, colorPalette);

      res.json({
        heroImageId,
        colorPalette,
        message: "Color palette extracted successfully"
      });
    } catch (error) {
      console.error("Error extracting colors:", error);
      res.status(500).json({ message: "Failed to extract color palette" });
    }
  });

  // Bulk color extraction - Extract colors for all hero images that don't have colors yet
  app.post("/api/hero-images/extract-all-colors", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const heroImages = await storage.getHeroImagesWithoutColors();
      console.log(`Found ${heroImages.length} hero images without color analysis`);

      if (heroImages.length === 0) {
        return res.json({ message: "All hero images already have color palettes extracted" });
      }

      // Import the color extractor
      const { ColorExtractor } = await import('./colorExtraction');

      const results = [];

      for (const heroImage of heroImages) {
        try {
          console.log(`Extracting colors for: ${heroImage.id}`);
          const colorPalette = await ColorExtractor.extractColors(heroImage.url || heroImage.imageUrl || '');

          await storage.updateHeroImageColors(heroImage.id, {
            dominantColor: colorPalette.dominantColor,
            colorPalette: colorPalette
          });

          results.push({
            heroImageId: heroImage.id,
            success: true,
            colorPalette: colorPalette
          });
        } catch (error) {
          console.error(`Error extracting colors for ${heroImage.id}:`, error);
          results.push({
            heroImageId: heroImage.id,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        message: `Color extraction completed for ${results.length} hero images`,
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: results.filter(r => !r.success).length
      });
    } catch (error) {
      console.error("Error in bulk color extraction:", error);
      res.status(500).json({ message: "Failed to extract color palettes" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Populate homepage with Unsplash photos
  app.post("/api/admin/populate-unsplash", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("🎨 Admin requesting Unsplash photo population...");

      const { populateWithUnsplashImagesFixed } = await import('./unsplash-fixed');
      const result = await populateWithUnsplashImagesFixed();

      res.json({
        success: true,
        message: `Successfully populated ${result.successCount} photos from Unsplash`,
        details: result
      });
    } catch (error) {
      console.error("Error populating Unsplash photos:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to populate photos from Unsplash",
        error: error.message 
      });
    }
  });

  // Public endpoint for users to see available hero images
  app.get("/api/hero-images", isAuthenticated, async (req, res) => {
    try {
      // Add cache-busting headers to force refresh
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const heroImages = await storage.getAllHeroImages();
      res.json(heroImages);
    } catch (error) {
      console.error("Error fetching hero images:", error);
      res.status(500).json({ message: "Failed to fetch hero images" });
    }
  });

  // Admin hero images routes
  app.get("/api/admin/hero-images", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Add cache-busting headers to force refresh
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const heroImages = await storage.getAllHeroImages();
      
      // Format data for admin dashboard compatibility
      const formattedImages = heroImages.map(img => ({
        ...img,
        imageUrl: img.url, // Add imageUrl property for admin dashboard
        is_default: img.isDefault, // Convert camelCase to snake_case
        lastUpdated: new Date().toISOString()
      }));
      
      res.json(formattedImages);
    } catch (error) {
      console.error("Error fetching hero images:", error);
      res.status(500).json({ message: "Failed to fetch hero images" });
    }
  });

  app.post("/api/admin/hero-images/:heroId/set-default", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { heroId } = req.params;
      await storage.setDefaultHeroImage(heroId);
      res.json({ message: "Default hero image updated successfully" });
    } catch (error) {
      console.error("Error setting default hero image:", error);
      res.status(500).json({ message: "Failed to set default hero image" });
    }
  });

  app.post("/api/admin/users/:userId/role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await storage.updateUserRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Admin route to get all photos for featuring
  app.get("/api/admin/photos", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const photos = await storage.getAllPhotosForAdmin();
      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos for admin:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  // Admin route to toggle photo featured status
  app.post("/api/admin/photos/:photoId/featured", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { photoId } = req.params;
      const { featured } = req.body;

      await storage.updatePhotoFeatured(parseInt(photoId), featured);
      res.json({ message: "Photo featured status updated successfully" });
    } catch (error) {
      console.error("Error updating photo featured status:", error);
      res.status(500).json({ message: "Failed to update featured status" });
    }
  });

  // Admin route to get storage analytics
  app.get("/api/admin/storage/analytics", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('🔍 Getting storage analytics for admin dashboard');
      const analytics = await getStorageAnalyticsAdmin();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting storage analytics:", error);
      res.status(500).json({ 
        message: "Failed to get storage analytics",
        error: error.message 
      });
    }
  });

  // Admin route to cleanup corrupted and orphaned files
  app.post("/api/admin/storage/cleanup", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { dryRun = true } = req.body;
      console.log(`🧹 Starting storage cleanup - dry run: ${dryRun}`);
      
      const { cleanupCorruptedAndOrphanedFiles } = await import('./objectStorage');
      const result = await cleanupCorruptedAndOrphanedFiles(dryRun);
      
      res.json({
        success: true,
        dryRun: dryRun,
        ...result
      });
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Storage cleanup failed', 
        error: error.message 
      });
    }
  });

  // Admin route to browse object storage directly
  app.get("/api/admin/object-storage/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      
      console.log('🔍 Fetching all users for object storage browser');
      
      // Get users from database for selection
      const users = await storage.getAllUsers();
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users for object storage browser:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin route to browse specific user's files in object storage
  app.get("/api/admin/object-storage/user/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      
      console.log(`🔍 Browsing object storage for user ${userId}`);
      
      // Try both possible prefixes for user files (photos are primarily in photo/ path)
      const possiblePrefixes = [`photo/${userId}/`, `profile/${userId}/`];
      let allFiles: any[] = [];
      
      for (const userPrefix of possiblePrefixes) {
        try {
          const listResult = await client.list({ prefix: userPrefix });
          
          if (listResult.ok && listResult.value) {
            console.log(`📁 Found ${listResult.value.length} files in ${userPrefix}:`, listResult.value.slice(0, 2));
            
            const prefixFiles = listResult.value.map((file: any) => {
              // Log the actual file object structure to understand what properties are available
              console.log('📄 File object properties:', Object.keys(file));
              console.log('📄 Raw file data:', file);
              
              const fileName = file.name || file.key || file.path || '';
              const fileSize = file.size || file.contentLength || 0;
              const modifiedDate = file.lastModified || file.modified || file.updated || new Date().toISOString();
              
              return {
                key: fileName,
                size: fileSize,
                lastModified: modifiedDate,
                url: `/images/${fileName}`,
                type: fileName.toLowerCase().includes('.jpg') || fileName.toLowerCase().includes('.jpeg') ? 'image/jpeg' :
                      fileName.toLowerCase().includes('.png') ? 'image/png' :
                      fileName.toLowerCase().includes('.webp') ? 'image/webp' : 
                      fileName.toLowerCase().includes('.gif') ? 'image/gif' : 'unknown',
                prefix: userPrefix
              };
            });
            allFiles = allFiles.concat(prefixFiles);
          }
        } catch (prefixError) {
          console.log(`No files found with prefix ${userPrefix} for user ${userId}`);
        }
      }
      
      res.json({
        userId,
        userPrefix: possiblePrefixes.join(', '),
        totalFiles: allFiles.length,
        files: allFiles.sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      });
    } catch (error) {
      console.error(`Error browsing object storage for user ${req.params.userId}:`, error);
      res.status(500).json({ 
        message: "Failed to browse user files",
        error: (error as Error).message || 'Unknown error'
      });
    }
  });

  // Admin route to get storage audit with real metrics
  app.get("/api/admin/storage/audit", async (req, res) => {
    try {
      console.log('🔍 Running comprehensive storage audit for admin dashboard');
      
      // Get total file count from storage usage table
      const totalFilesResult = await db.select({ 
        count: sql<number>`COUNT(*)::int`
      }).from(storageUsage);
      const totalFiles = totalFilesResult[0]?.count || 0;

      // Calculate total size by parsing KB/MB values
      const storageEntries = await db.select({
        compressedSize: storageUsage.compressedSize
      }).from(storageUsage);

      let totalSizeInBytes = 0;
      for (const entry of storageEntries) {
        const sizeStr = entry.compressedSize;
        if (sizeStr.endsWith('KB')) {
          totalSizeInBytes += parseFloat(sizeStr.replace('KB', '')) * 1024;
        } else if (sizeStr.endsWith('MB')) {
          totalSizeInBytes += parseFloat(sizeStr.replace('MB', '')) * 1024 * 1024;
        } else if (sizeStr.endsWith('B')) {
          totalSizeInBytes += parseFloat(sizeStr.replace('B', ''));
        }
      }

      // Convert total size to human readable format
      let totalSizeFormatted;
      if (totalSizeInBytes >= 1024 * 1024 * 1024) {
        totalSizeFormatted = `${(totalSizeInBytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
      } else if (totalSizeInBytes >= 1024 * 1024) {
        totalSizeFormatted = `${(totalSizeInBytes / (1024 * 1024)).toFixed(1)}MB`;
      } else if (totalSizeInBytes >= 1024) {
        totalSizeFormatted = `${(totalSizeInBytes / 1024).toFixed(0)}KB`;
      } else {
        totalSizeFormatted = `${totalSizeInBytes}B`;
      }

      // Get breakdown by image type
      const typeBreakdown = await db.select({
        imageType: storageUsage.imageType,
        count: sql<number>`COUNT(*)::int`,
      }).from(storageUsage).groupBy(storageUsage.imageType);

      const audit = {
        totalFiles,
        totalSize: totalSizeFormatted,
        totalSizeBytes: totalSizeInBytes,
        breakdown: typeBreakdown,
        lastRun: new Date().toISOString(),
        status: "✅ Storage audit complete"
      };

      console.log('📊 Storage audit results:', audit);
      res.json(audit);
    } catch (error) {
      console.error("Error running storage audit:", error);
      res.status(500).json({ 
        message: "Failed to run storage audit",
        error: error.message 
      });
    }
  });

  // Admin route to audit specific user storage
  app.post("/api/admin/storage/user-audit", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`🔍 Running comprehensive user storage audit for: ${userId}`);

      // Get all user's data from database
      const [userPhotos, userProfile] = await Promise.all([
        storage.getUserPhotos(userId),
        storage.getProfileByUsername(userId) // Note: using available method
      ]);

      // For now, assume no hero selections (simplified)
      const userHeroSelections: any[] = [];

      console.log(`📊 Database records for user ${userId}:`);
      console.log(`  - Photos: ${userPhotos.length}`);
      console.log(`  - Profile: ${userProfile ? 'exists' : 'none'}`);
      console.log(`  - Hero selections: ${userHeroSelections.length}`);

      // Get all files from object storage and filter for this user
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      
      const listResult = await client.list();
      if (!listResult.ok) {
        throw new Error('Failed to list storage files');
      }

      // Filter files that belong to this user (comprehensive search)
      const userStorageFiles = listResult.value.filter((file: any) => {
        const name = file.name || '';
        return (
          name.includes(`/${userId}/`) ||
          name.includes(`user/${userId}`) ||
          name.includes(`profile/${userId}`) ||
          name.includes(`photo/${userId}`) ||
          name.includes(`hero/${userId}`) ||
          name.startsWith(`${userId}/`) ||
          name.startsWith(`${userId}_`)
        );
      });

      console.log(`📁 Found ${userStorageFiles.length} storage files for user ${userId}`);

      // Categorize files by type
      const fileBreakdown = {
        photos: userStorageFiles.filter(f => (f.name || '').includes('/photo') || (f.name || '').includes('photo')).length,
        hero: userStorageFiles.filter(f => (f.name || '').includes('/hero') || (f.name || '').includes('hero')).length,
        profile: userStorageFiles.filter(f => (f.name || '').includes('/profile') || (f.name || '').includes('profile')).length,
        other: 0
      };
      fileBreakdown.other = userStorageFiles.length - (fileBreakdown.photos + fileBreakdown.hero + fileBreakdown.profile);

      // Calculate storage size (estimate)
      const estimatedSize = userStorageFiles.length * 500; // Rough estimate in KB
      const formattedSize = estimatedSize > 1024 ? `${(estimatedSize / 1024).toFixed(1)}MB` : `${estimatedSize}KB`;

      // Determine integrity status
      const totalDatabaseReferences = userPhotos.length + (userProfile ? 1 : 0) + userHeroSelections.length;
      const discrepancy = Math.abs(userStorageFiles.length - totalDatabaseReferences);
      const integrityStatus = discrepancy === 0 ? 'PERFECT_MATCH' : 
                            discrepancy <= 2 ? 'MINOR_DISCREPANCY' : 'SIGNIFICANT_MISMATCH';

      // Generate recommendations
      const recommendations = [];
      if (userStorageFiles.length > totalDatabaseReferences) {
        recommendations.push(`${discrepancy} potential orphaned files detected`);
        recommendations.push('Some files may not be referenced in database');
      } else if (userStorageFiles.length < totalDatabaseReferences) {
        recommendations.push(`${discrepancy} missing files detected`);
        recommendations.push('Some database records may reference missing files');
      } else {
        recommendations.push('Storage and database are perfectly synchronized');
      }

      const auditResult = {
        userId,
        user: {
          email: (req.user as any)?.claims?.email || 'Unknown',
          firstName: (req.user as any)?.claims?.first_name || '',
          lastName: (req.user as any)?.claims?.last_name || ''
        },
        storage: {
          totalFiles: userStorageFiles.length,
          estimatedSize: formattedSize,
          breakdown: fileBreakdown
        },
        database: {
          photos: userPhotos.length,
          hasProfile: !!userProfile,
          heroSelections: userHeroSelections.length,
          totalReferences: totalDatabaseReferences
        },
        integrity: {
          status: integrityStatus,
          discrepancy,
          recommendations
        },
        lastAudit: new Date().toISOString()
      };

      console.log(`✅ User audit complete for ${userId}:`, {
        files: userStorageFiles.length,
        dbRefs: totalDatabaseReferences,
        status: integrityStatus
      });

      res.json(auditResult);

    } catch (error) {
      console.error("Error running user storage audit:", error);
      res.status(500).json({ 
        message: "Failed to run user storage audit",
        error: error.message 
      });
    }
  });

  app.post("/api/hero-images/default", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { heroId } = req.body;

      if (!heroId) {
        return res.status(400).json({ message: "Hero ID is required" });
      }

      await storage.setDefaultHeroImage(heroId);
      res.json({ message: "Default hero image set successfully" });
    } catch (error) {
      console.error("Error setting default hero image:", error);
      res.status(500).json({ message: "Failed to set default hero image" });
    }
  });

  // Get user's current hero selection
  app.get("/api/user/hero-selection", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Getting hero selection for user:', userId);

      const selection = await storage.getUserHeroSelection(userId);
      console.log('User hero selection found:', selection);

      // Check for custom hero image from user's photo collection first
      if (selection && selection.customImageUrl) {
        console.log('Found custom hero image from user collection:', selection.customImageUrl);
        const customHero = {
          id: 'custom-' + userId,
          url: selection.customImageUrl,
          name: selection.customImageTitle || 'Custom Hero Image',
          description: 'Custom hero image from user\'s photo collection',
          isActive: true,
          isDefault: false
        };
        console.log('Returning custom user hero image:', customHero);
        res.json(customHero);
        return;
      }

      // Fall back to global hero image selection
      if (selection && selection.heroImageId) {
        const heroImage = await storage.getHeroImageById(selection.heroImageId);

        if (heroImage) {
          res.json(heroImage);
          return;
        }
      }

      // Fallback to default hero image if no selection or hero image not found
      console.log('Falling back to default hero image');
      const defaultHero = await storage.getDefaultHeroImage();
      res.json(defaultHero);
    } catch (error) {
      console.error("Error getting user hero selection:", error);
      // Fallback to default
      const defaultHero = await storage.getDefaultHeroImage();
      res.json(defaultHero);
    }
  });

  // Get any user's hero banner selection (for portfolio pages)
  app.get('/api/user/hero-selection/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Getting hero selection for portfolio user:', userId);

      const selection = await storage.getUserHeroSelection(userId);
      console.log('Portfolio user hero selection found:', selection);

      if (selection && selection.heroImageId) {
        // Get the hero image details
        console.log('Looking for hero image with ID:', selection.heroImageId);
        const heroImage = await storage.getHeroImageById(selection.heroImageId);
        console.log('Hero image details found:', heroImage);

        if (heroImage) {
          console.log('Returning portfolio user hero image:', heroImage);
          res.json(heroImage);
          return;
        } else {
          console.log('Hero image not found for ID:', selection.heroImageId);
        }
      }

      // Fallback to default hero image if no selection or hero image not found
      console.log('Falling back to default hero image for portfolio');
      const defaultHero = await storage.getDefaultHeroImage();
      res.json(defaultHero);
    } catch (error) {
      console.error('Error getting portfolio user hero selection:', error);
      res.status(500).json({ message: 'Failed to get hero selection' });
    }
  });

  // Set global hero image selection
  app.post("/api/user/hero-image/set-global", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { heroImageId } = req.body;

      console.log(`🔥 BACKEND: Hero image selection request received`);
      console.log(`🔥 BACKEND: User ID: ${userId}`);
      console.log(`🔥 BACKEND: Hero Image ID: ${heroImageId}`);
      console.log(`🔥 BACKEND: Request body:`, JSON.stringify(req.body, null, 2));

      if (!heroImageId) {
        console.error(`🔥 BACKEND: Missing hero image ID`);
        return res.status(400).json({ message: "Hero image ID is required" });
      }

      // Validate that the hero image exists
      const heroImage = await storage.getHeroImageById(heroImageId);
      if (!heroImage) {
        console.error(`🔥 BACKEND: Hero image not found: ${heroImageId}`);
        return res.status(404).json({ message: "Hero image not found" });
      }

      console.log(`🔥 BACKEND: Hero image validated: ${heroImage.name}`);
      console.log(`🎯 User ${userId} selecting global hero image: ${heroImageId}`);

      // Set global hero image selection with comprehensive logging
      const result = await storage.setUserHeroSelection({
        userId: String(userId),
        heroImageId: String(heroImageId),
        customImageUrl: null, // Clear custom image when selecting global hero
        customImageTitle: null
      });

      console.log(`🔥 BACKEND: Storage result:`, JSON.stringify(result, null, 2));
      console.log(`✅ Global hero image updated successfully for user: ${userId}`);

      res.json({
        success: true,
        message: "Global hero image set successfully",
        heroImageId: heroImageId,
        heroImageName: heroImage.name,
        result: result
      });
    } catch (error: any) {
      console.error("🔥 BACKEND: Error setting global hero image:", error);
      console.error("🔥 BACKEND: Error stack:", error.stack);
      res.status(500).json({ 
        success: false,
        message: "Failed to set global hero image",
        error: error.message 
      });
    }
  });

  // Set custom hero image from user's own photo collection
  app.post("/api/user/hero-image/set-custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { photoId } = req.body;

      if (!photoId) {
        return res.status(400).json({ message: "Photo ID is required" });
      }

      // Verify the photo belongs to the user
      const photo = await storage.getPhotoById(photoId);
      if (!photo || photo.userId !== userId) {
        return res.status(403).json({ message: "Photo not found or access denied" });
      }

      // SECURITY: Validate that custom image is from user's own folder, not global hero folder
      if (photo.imageUrl.includes('global/hero-images/')) {
        console.error(`🚫 SECURITY VIOLATION: User ${userId} attempted to use global hero image as custom: ${photo.imageUrl}`);
        return res.status(403).json({ message: "Security violation: Cannot use global hero images as custom" });
      }

      // SECURITY: Ensure the image URL contains the user's ID
      if (!photo.imageUrl.includes(`/${userId}/`)) {
        console.error(`🚫 SECURITY VIOLATION: User ${userId} attempted to access non-owned image: ${photo.imageUrl}`);
        return res.status(403).json({ message: "Security violation: Image does not belong to user" });
      }

      // Set custom hero image using the photo's URL and title
      await storage.setUserHeroSelection({
        userId: String(userId),
        heroImageId: null, // Clear global hero selection
        customImageUrl: photo.imageUrl,
        customImageTitle: photo.title || 'Custom Hero Image'
      });

      console.log(`✅ User ${userId} set custom hero image from photo ${photoId} (validated)`);

      res.json({
        message: "Custom hero image set successfully",
        customImageUrl: photo.imageUrl,
        customImageTitle: photo.title
      });
    } catch (error) {
      console.error("Error setting custom hero image:", error);
      res.status(500).json({ message: "Failed to set custom hero image" });
    }
  });

  // Upload dedicated profile picture (separate from photo collection)
  app.post("/api/user/profile-image/upload", isAuthenticated, upload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Profile image file is required" });
      }

      console.log(`📸 Profile image upload initiated for user ${userId}`);

      // Compress the profile image
      const compressedBuffer = await sharp(file.buffer)
        .resize(400, 400, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload to object storage using the proper uploadImage function
      const uploadResult = await uploadImage(compressedBuffer, {
        userId: parseInt(userId),
        originalFilename: file.originalname,
        mimeType: 'image/jpeg',
        imageType: 'profile'
      });

      // Update user's profile image URL
      await storage.updateUserProfileImage(userId, uploadResult.url);

      console.log(`✅ Profile image uploaded successfully for user ${userId}: ${uploadResult.key}`);

      res.json({
        message: "Profile image uploaded successfully",
        profileImageUrl: uploadResult.url
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });

  // Set custom profile image from user's own photo collection (optional)
  app.post("/api/user/profile-image/set-custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { photoId } = req.body;

      if (!photoId) {
        return res.status(400).json({ message: "Photo ID is required" });
      }

      // Verify the photo belongs to the user
      const photo = await storage.getPhotoById(photoId);
      if (!photo || photo.userId !== userId) {
        return res.status(403).json({ message: "Photo not found or access denied" });
      }

      // Update user's profile image URL in the users table
      await storage.updateUserProfileImage(userId, photo.imageUrl);

      console.log(`User ${userId} set custom profile image from photo ${photoId}`);

      res.json({
        message: "Profile image updated successfully",
        profileImageUrl: photo.imageUrl
      });
    } catch (error) {
      console.error("Error setting custom profile image:", error);
      res.status(500).json({ message: "Failed to set custom profile image" });
    }
  });

  // GET-based hero banner update (works with existing auth)
  app.get("/api/hero-selection/:heroImage", isAuthenticated, async (req: any, res) => {
    try {
      const { heroImage } = req.params;
      const userId = req.user.claims.sub;

      console.log('Hero banner update for user:', userId, 'selecting:', heroImage);

      // Update the hero banner in the user hero selections table - simplified approach
      await storage.setUserHeroSelection({
        userId: String(userId),
        heroImageId: String(heroImage),
        customImageUrl: null, // Clear custom image when selecting global hero
        customImageTitle: null
      });

      console.log('Hero banner updated successfully for user:', userId);

      res.json({
        message: "Hero banner updated successfully",
        heroImage: heroImage
      });
    } catch (error) {
      console.error("Error updating hero banner:", error);
      return res.status(500).json({ 
        message: "Failed to update hero banner",
        error: error.message || "Database error occurred"
      });
    }
  });

  // Profile update endpoint
  app.post("/api/profile/update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { username, firstName, lastName, tagline, aboutMe, portfolioUrlType } = req.body;

      // Only update our custom profiles table - never touch Replit Auth users table
      const updatedProfile = await storage.updateProfile(userId, {
        username,
        firstName, 
        lastName,
        tagline,
        aboutMe,
        portfolioUrlType
      });

      // Get the current user data from Replit Auth (read-only)
      const currentUser = await storage.getUser(userId);

      return res.json({ 
        message: "Profile updated successfully",
        user: currentUser, // Return current Replit Auth data unchanged
        profile: updatedProfile
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ 
        message: "Failed to update profile",
        error: error.message || "Database error occurred"
      });
    }
  });

  // User hero banner selection endpoints (for regular photographers)
  app.get("/api/user/hero-images", isAuthenticated, async (req, res) => {
    try {
      // Get all available hero images that users can choose from
      const heroImages = await storage.getAllHeroImages();
      res.json(heroImages);
    } catch (error) {
      console.error("Error fetching hero images for user:", error);
      res.status(500).json({ message: "Failed to fetch hero images" });
    }
  });

  app.post("/api/user/hero-image/select", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { heroImageId } = req.body;

      if (!heroImageId) {
        return res.status(400).json({ message: "Hero image ID is required" });
      }

      console.log(`User ${userId} selecting hero image: ${heroImageId}`);

      // Update the user's profile with their selected hero image
      let existingProfile = await storage.getProfileByUserId(userId);

      if (existingProfile) {
        // Update existing profile
        await storage.updateProfile(userId, {
          heroImage: heroImageId,
          updatedAt: new Date()
        });
      } else {
        // Create new profile with selected hero image
        await storage.createProfile({
          userId,
          username: '',
          firstName: '',
          lastName: '',
          tagline: '',
          heroImage: heroImageId,
          aboutMe: ''
        });
      }

      res.json({ 
        message: "Hero image selection updated successfully",
        heroImageId 
      });
    } catch (error) {
      console.error("Error updating user hero image selection:", error);
      res.status(500).json({ message: "Failed to update hero image selection" });
    }
  });

  // AI Recommendation endpoints
  app.get("/api/admin/ai-recommendations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const heroImages = await storage.getAllHeroImages();
      const analysis = await aiRecommendationService.analyzeHeroBanners(heroImages);
      res.json(analysis);
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      // Return a fallback response instead of failing completely
      res.json({
        analysis: [],
        recommendations: [],
        insights: ['AI analysis temporarily unavailable. Please try again later.'],
      });
    }
  });

  app.get("/api/admin/ai-theme-suggestions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const heroImages = await storage.getAllHeroImages();
      const suggestions = await aiRecommendationService.suggestNewBannerThemes(heroImages);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating theme suggestions:", error);
      res.json({
        suggestions: ['AI theme suggestions temporarily unavailable. Please try again later.']
      });
    }
  });

  app.post("/api/admin/ai-user-recommendation", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userProfile } = req.body;
      const heroImages = await storage.getAllHeroImages();
      const recommendation = await aiRecommendationService.recommendBannerForUser(userProfile, heroImages);
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating user-specific recommendation:", error);
      // Return a fallback recommendation
      const heroImages = await storage.getAllHeroImages();
      res.json({
        recommendedBannerId: heroImages[0]?.id || 'default',
        reason: 'Default recommendation - AI analysis temporarily unavailable',
        confidence: 0.5,
        userType: 'general',
        timeContext: 'always'
      });
    }
  });

  app.get("/api/admin/ai-theme-suggestions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const heroImages = await storage.getAllHeroImages();
      const suggestions = await aiRecommendationService.suggestNewBannerThemes(heroImages);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating theme suggestions:", error);
      // Return fallback suggestions
      res.json({
        suggestions: [
          'Dramatic storm clouds over mountain peaks',
          'Minimalist modern architecture with clean lines',
          'Warm golden hour portrait photography',
          'Abstract water reflections and ripples',
          'Rustic countryside landscape with wildflowers'
        ]
      });
    }
  });

  // SEO Routes
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const { generateSitemap } = await import('./seo-service');
      const sitemap = await generateSitemap();

      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  app.get('/robots.txt', (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /
Allow: /portfolio/*
Disallow: /admin
Disallow: /api/
Sitemap: https://imfolio.com/sitemap.xml`;

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });

  // API endpoint to generate SEO metadata for portfolios
  app.get('/api/seo/portfolio/:userId', async (req, res) => {
    try {
      const { generatePortfolioSEO } = await import('./seo-service');
      const { userId } = req.params;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'Portfolio not found' });
      }

      const photoCount = 0; // Will be updated when photos are implemented
      const seoData = await generatePortfolioSEO(
        userId, 
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
        photoCount
      );

      res.json(seoData);
    } catch (error) {
      console.error('Error generating portfolio SEO:', error);
      res.status(500).json({ error: 'Failed to generate SEO metadata' });
    }
  });

  // API endpoint to generate image SEO metadata
  app.post('/api/seo/image', async (req, res) => {
    try {
      const { generateImageSEO } = await import('./seo-service');
      const { imageUrl, filename, photographerName } = req.body;

      if (!imageUrl || !filename) {
        return res.status(400).json({ error: 'Image URL and filename are required' });
      }

      const seoData = await generateImageSEO(imageUrl, filename, photographerName);
      res.json(seoData);
    } catch (error) {
      console.error('Error generating image SEO:', error);
      res.status(500).json({ error: 'Failed to generate image SEO metadata' });
    }
  });

  // Debug endpoint to test object storage and find actual hero image paths
  app.get('/api/debug/object-storage', async (req, res) => {
    try {
      const { Client } = await import('@replit/object-storage');
      const client = new Client();

      // Test common hero image paths to see what actually exists
      const testPaths = [
        'hero-images/lavender-field.jpg',
        'hero-images/forest-path.jpg', 
        'global/hero-images/lavender-field.jpg',
        'global/hero-images/forest-path.jpg',
        'lavender-field.jpg',
        'forest-path.jpg'
      ];

      const results = [];
      for (const path of testPaths) {
        try {
          const exists = await client.exists(path);
          results.push({
            path,
            exists: exists.ok && exists.value,
            status: exists.ok ? 'OK' : 'Failed to check'
          });
        } catch (error) {
          results.push({
            path,
            exists: false,
            status: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
          });
        }
      }

      res.json({
        message: 'Object storage test results',
        results
      });
    } catch (error) {
      res.status(500).json({
        error: `Object storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

// Serve images from object storage with proper access control
app.get('/images/:path*', async (req: any, res: any) => {
  try {
    const imagePath = req.params.path + (req.params[0] || '');
    
    // Simple and clean: Global images (hero images) are public, user images require authentication
    const isGlobalImage = imagePath.startsWith('global/');
    const isUserSpecificImage = imagePath.includes('/user/') || imagePath.includes('/photo/') || imagePath.includes('/profile/');
    
    // Require authentication for user-specific images
    if (isUserSpecificImage && !req.isAuthenticated?.()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // For user-specific images, verify user can only access their own
    if (isUserSpecificImage && req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const pathUserId = imagePath.match(/\/(?:user|photo|profile)\/(\d+)\//)?.[1];
      if (pathUserId && pathUserId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Use the proper image proxy for serving images
    const { serveImage } = await import('./image-proxy');
    return await serveImage(req, res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}