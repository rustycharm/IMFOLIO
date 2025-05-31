import {
  users,
  profiles,
  photos,
  messages,
  heroImages,
  userHeroSelections,
  storageUsage,
  portfolioTemplates,
  userTemplateSelections,
  type User,
  type UpsertUser,
  type Photo,
  type Profile,
  type Message,
  type HeroImage,
  type UserHeroSelection,
  type InsertUserHeroSelection,
  type StorageUsage,
  type InsertStorageUsage,
  type InsertPhoto,
  type PortfolioTemplate,
  type UserTemplateSelection,
  type InsertUserTemplateSelection,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;

  // Profile operations - separate from auth for customizable data
  getProfile(userId: string): Promise<Profile | undefined>;

  // Photo operations
  getAllPhotos(): Promise<Photo[]>;
  getPublicPhotos(filters?: { featured?: boolean; category?: string }): Promise<Photo[]>;
  getAllPhotosForAdmin(): Promise<any[]>;
  getPhotosByUserId(userId: string): Promise<Photo[]>;
  getUserPhotos(userId: string): Promise<Photo[]>; // For storage audit
  getPublicPhotosByUserId(userId: string): Promise<Photo[]>;
  getPhotoByHash(userId: string, fileHash: string): Promise<Photo | undefined>;
  createPhoto(data: InsertPhoto): Promise<Photo>;
  updatePhotoFeatured(photoId: number, featured: boolean): Promise<Photo>;
  updatePhotoFeaturedStatus(photoId: number, featured: boolean): Promise<Photo>;
  updatePhotoPublicStatus(photoId: number, isPublic: boolean): Promise<Photo>;
  updatePhotoVisibility(photoId: number, userId: string, isPublic: boolean): Promise<Photo | null>;
  deletePhoto(photoId: number): Promise<boolean>;

  // Storage tracking operations
  logStorageUsage(data: InsertStorageUsage): Promise<StorageUsage>;
  getUserStorageUsage(userId: string): Promise<StorageUsage[]>;
  getTotalStorageUsage(): Promise<{ totalSize: number; userCount: number }>;

  // Hero image operations
  getAllHeroImages(): Promise<HeroImage[]>;
  getHeroImageById(heroImageId: string): Promise<HeroImage | undefined>;
  createHeroImage(data: any): Promise<HeroImage>;
  setDefaultHeroImage(heroId: string): Promise<void>;

  // User hero selection operations
  getUserHeroSelection(userId: string): Promise<UserHeroSelection | undefined>;
  setUserHeroSelection(data: InsertUserHeroSelection): Promise<UserHeroSelection>;
  deleteUserHeroSelection(userId: string): Promise<void>;

  // Message operations
  getAllMessages(): Promise<Message[]>;
  createMessage(userId: string, content: string): Promise<Message>;

  // Profile operations
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  getProfileByUsername(username: string): Promise<Profile | undefined>;
  createProfile(data: any): Promise<Profile>;
  updateProfile(userId: string, data: any): Promise<Profile>;

  // Template operations
  getAllPortfolioTemplates(): Promise<PortfolioTemplate[]>;
  getPortfolioTemplate(templateId: string): Promise<PortfolioTemplate | undefined>;
  getUserTemplateSelection(userId: string): Promise<UserTemplateSelection | undefined>;
  setUserTemplateSelection(data: InsertUserTemplateSelection): Promise<UserTemplateSelection>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // For now, treat username as ID since we're using Replit IDs
    return this.getUser(username);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Photo operations
  async getAllPhotos(): Promise<Photo[]> {
    return await db.select().from(photos);
  }

  async getPublicPhotos(filters?: { featured?: boolean; category?: string }): Promise<Photo[]> {
    const conditions = [eq(photos.isPublic, true)];

    // When featured is explicitly requested (true), only return featured photos
    // When featured is not specified, return all public photos
    if (filters?.featured === true) {
      conditions.push(eq(photos.featured, true));
    }

    if (filters?.category && filters.category !== 'all') {
      // Only include photos that have a category AND match the requested category
      conditions.push(sql`${photos.category} IS NOT NULL AND ${photos.category} = ${filters.category}`);
    }

    return await db.select().from(photos).where(and(...conditions));
  }

  async getPhotosByUserId(userId: string): Promise<Photo[]> {
    return await db.select().from(photos).where(eq(photos.userId, userId)).orderBy(photos.id);
  }

  // Alias for consistency with API endpoints
  async getPhotosByUser(userId: string): Promise<Photo[]> {
    return this.getPhotosByUserId(userId);
  }

  // For storage audit functionality
  async getUserPhotos(userId: string): Promise<Photo[]> {
    return this.getPhotosByUserId(userId);
  }

  async getPublicPhotosByUserId(userId: string): Promise<Photo[]> {
    return await db
      .select()
      .from(photos)
      .where(sql`${photos.userId} = ${userId} AND ${photos.isPublic} = true`);
  }

  async getPhotoByHash(userId: string, fileHash: string): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.fileHash, fileHash)))
      .limit(1);
    return photo;
  }

  async createPhoto(data: InsertPhoto): Promise<Photo> {
    const [photo] = await db
      .insert(photos)
      .values(data)
      .returning();
    return photo;
  }

  async getAllPhotosForAdmin(): Promise<any[]> {
    const result = await db
      .select({
        id: photos.id,
        title: photos.title,
        description: photos.description,
        imageUrl: photos.imageUrl,
        category: photos.category,
        isPublic: photos.isPublic,
        featured: photos.featured,
        userId: photos.userId,
        photographerUsername: profiles.username,
        createdAt: photos.createdAt
      })
      .from(photos)
      .leftJoin(profiles, eq(photos.userId, profiles.userId))
      .orderBy(photos.createdAt);
    return result;
  }

  async updatePhotoFeatured(photoId: number, featured: boolean): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({ featured })
      .where(eq(photos.id, photoId))
      .returning();
    return photo;
  }

  async updatePhotoFeaturedStatus(photoId: number, featured: boolean): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({ featured })
      .where(eq(photos.id, photoId))
      .returning();
    return photo;
  }

  async getPhotoById(photoId: number): Promise<Photo | undefined> {
    const [photo] = await db
      .select()
      .from(photos)
      .where(eq(photos.id, photoId));
    return photo;
  }

  async updateUserProfileImage(userId: string, profileImageUrl: string): Promise<UpsertUser> {
    const [user] = await db
      .update(users)
      .set({ 
        profileImageUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updatePhotoPublicStatus(photoId: number, isPublic: boolean): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({ isPublic })
      .where(eq(photos.id, photoId))
      .returning();
    return photo;
  }

  async updatePhotoFeatured(photoId: number, featured: boolean): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({ featured })
      .where(eq(photos.id, photoId))
      .returning();
    return photo;
  }

  async updatePhotoVisibility(photoId: number, userId: string, isPublic: boolean): Promise<Photo | null> {
    const [photo] = await db
      .update(photos)
      .set({ isPublic })
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
      .returning();
    return photo || null;
  }

  async updatePhotoMetadata(photoId: number, metadata: {
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
  }): Promise<Photo> {
    const [photo] = await db
      .update(photos)
      .set({
        ...metadata,
        updatedAt: new Date()
      })
      .where(eq(photos.id, photoId))
      .returning();
    return photo;
  }

  async deletePhoto(photoId: number): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, photoId));
    return (result.rowCount ?? 0) > 0;
  }

  // Storage tracking operations
  async logStorageUsage(data: InsertStorageUsage): Promise<StorageUsage> {
    const [usage] = await db
      .insert(storageUsage)
      .values(data)
      .returning();
    return usage;
  }

  async getUserStorageUsage(userId: string): Promise<StorageUsage[]> {
    return await db
      .select()
      .from(storageUsage)
      .where(eq(storageUsage.userId, userId));
  }

  async getTotalStorageUsage(): Promise<{ totalSize: number; userCount: number }> {
    // This would require complex aggregation - for now return basic stats
    const allUsage = await db.select().from(storageUsage);
    const totalSize = allUsage.reduce((sum, usage) => {
      // Parse the compressed size string (assuming format like "1.2MB" or "512KB")
      const sizeStr = usage.compressedSize;
      const sizeMatch = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        const bytes = unit === 'GB' ? value * 1024 * 1024 * 1024 :
                     unit === 'MB' ? value * 1024 * 1024 :
                     value * 1024; // KB
        return sum + bytes;
      }
      return sum;
    }, 0);

    const uniqueUsers = new Set(allUsage.map(u => u.userId));
    return { totalSize, userCount: uniqueUsers.size };
  }

  // Hero image operations
  async getAllHeroImages(): Promise<HeroImage[]> {
    const images = await db.select().from(heroImages).where(eq(heroImages.isActive, true));
    return images;
  }




  async createHeroImage(data: any): Promise<HeroImage> {
    const [heroImage] = await db
      .insert(heroImages)
      .values(data)
      .returning();
    return heroImage;
  }

  // Message operations
  async getAllMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async createMessage(userId: string, content: string): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        userId,
        content,
      })
      .returning();
    return message;
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    return profile;
  }



  async createProfile(data: any): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(data)
      .returning();
    return profile;
  }

  async updateProfile(userId: string, data: any): Promise<Profile> {
    console.log('🔥 STORAGE: updateProfile called with userId:', userId);
    console.log('🔥 STORAGE: updateProfile data:', JSON.stringify(data, null, 2));

    // Map camelCase to snake_case for database columns
    const updateData: any = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.instagram !== undefined) updateData.instagram = data.instagram;
    if (data.facebook !== undefined) updateData.facebook = data.facebook;
    if (data.twitter !== undefined) updateData.twitter = data.twitter;
    if (data.portfolioUrlType !== undefined) updateData.portfolioUrlType = data.portfolioUrlType;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    updateData.updatedAt = new Date();

    console.log('🔥 STORAGE: Mapped updateData for database:', JSON.stringify(updateData, null, 2));

    // Try to update first (for existing profiles)
    const updated = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.userId, userId))
      .returning();

    console.log('🔥 STORAGE: Database update result:', JSON.stringify(updated, null, 2));

    if (updated.length > 0) {
      return updated[0];
    }

    // If no profile exists, create one
    const [created] = await db
      .insert(profiles)
      .values({
        userId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return created;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setDefaultHeroImage(heroId: string): Promise<void> {
    // First, clear any existing default
    await db.update(heroImages)
      .set({ isDefault: false })
      .where(eq(heroImages.isDefault, true));

    // Then set the specified hero image as default
    await db.update(heroImages)
      .set({ isDefault: true })
      .where(eq(heroImages.id, heroId));
  }

  async getDefaultHeroImage() {
    const [defaultHero] = await db.select()
      .from(heroImages)
      .where(eq(heroImages.isDefault, true))
      .limit(1);

    return defaultHero;
  }

  // User hero selection operations
  async getUserHeroSelection(userId: string): Promise<UserHeroSelection | undefined> {
    const [result] = await db
      .select()
      .from(userHeroSelections)
      .where(and(
        eq(userHeroSelections.userId, userId),
        eq(userHeroSelections.isActive, true)
      ))
      .orderBy(desc(userHeroSelections.createdAt))
      .limit(1);

    return result;
  }

  async getHeroImageById(heroImageId: string): Promise<HeroImage | undefined> {
    const [heroImage] = await db
      .select()
      .from(heroImages)
      .where(eq(heroImages.id, heroImageId));
    
    return heroImage;
  }

  async updateHeroImageColors(heroImageId: string, colorData: {
    dominantColor: string;
    colorPalette: any;
  }): Promise<void> {
    await db.execute(sql`
      UPDATE hero_images 
      SET 
        dominant_color = ${colorData.dominantColor},
        color_palette = ${JSON.stringify(colorData.colorPalette)},
        color_analysis_complete = true,
        color_extracted_at = NOW()
      WHERE id = ${heroImageId}
    `);
  }

  async getHeroImagesWithoutColors(): Promise<HeroImage[]> {
    const result = await db.execute(sql`
      SELECT * FROM hero_images 
      WHERE color_analysis_complete = false OR color_analysis_complete IS NULL
      ORDER BY created_at DESC
    `);

    return result.rows as HeroImage[];
  }

  async setUserHeroSelection(data: InsertUserHeroSelection): Promise<UserHeroSelection> {
    console.log('🔥 setUserHeroSelection called with data:', JSON.stringify(data, null, 2));

    // Try to update first (most common case for established users)
    console.log('🔥 Attempting to update existing hero selection...');
    const updated = await db.update(userHeroSelections)
      .set({
        heroImageId: data.heroImageId,
        customImageUrl: data.customImageUrl,
        customImageTitle: data.customImageTitle,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(userHeroSelections.userId, data.userId))
      .returning();

    console.log('🔥 Update result:', JSON.stringify(updated, null, 2));

    if (updated.length > 0) {
      console.log('🔥 Successfully updated existing hero selection');
      return updated[0];
    }

    // Only create new record if update didn't affect any rows (truly new user)
    console.log('🔥 No existing record found, creating new hero selection...');
    try {
      const [inserted] = await db.insert(userHeroSelections)
        .values({
          userId: data.userId,
          heroImageId: data.heroImageId,
          customImageUrl: data.customImageUrl,
          customImageTitle: data.customImageTitle,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log('🔥 Successfully inserted new hero selection:', JSON.stringify(inserted, null, 2));
      return inserted;
    } catch (error) {
      console.log('🔥 Insert failed, retrying update...', error);
      // If insert fails due to race condition, try update again
      const retryUpdate = await db.update(userHeroSelections)
        .set({
          heroImageId: data.heroImageId,
          customImageUrl: data.customImageUrl,
          customImageTitle: data.customImageTitle,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(userHeroSelections.userId, data.userId))
        .returning();

      if (retryUpdate.length > 0) {
        return retryUpdate[0];
      }
      throw error;
    }
  }

  async deleteUserHeroSelection(userId: string): Promise<void> {
    await db.update(userHeroSelections)
      .set({ isActive: false })
      .where(eq(userHeroSelections.userId, userId));
  }

  // Profile management methods for persistent user profile updates
  async getUserProfile(userId: string): Promise<any> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));

    if (!profile) {
      // Create default profile if none exists
      const [created] = await db
        .insert(profiles)
        .values({
          userId,
          username: userId,
          isPublic: true
        })
        .returning();
      return created;
    }

    return profile;
  }

  async getProfileByUsername(username: string): Promise<any> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.username, username));
    return profile || null;
  }

  async getProfileByUserId(userId: string): Promise<any> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile || null;
  }

  // Template operations
  async getAllPortfolioTemplates(): Promise<PortfolioTemplate[]> {
    return await db.select().from(portfolioTemplates).where(eq(portfolioTemplates.isActive, true));
  }

  async getPortfolioTemplate(templateId: string): Promise<PortfolioTemplate | undefined> {
    const [template] = await db
      .select()
      .from(portfolioTemplates)
      .where(and(eq(portfolioTemplates.id, templateId), eq(portfolioTemplates.isActive, true)));
    return template;
  }

  async getUserTemplateSelection(userId: string): Promise<UserTemplateSelection | undefined> {
    const [selection] = await db
      .select()
      .from(userTemplateSelections)
      .where(and(
        eq(userTemplateSelections.userId, userId),
        eq(userTemplateSelections.isActive, true)
      ))
      .orderBy(desc(userTemplateSelections.createdAt))
      .limit(1);
    return selection;
  }

  async setUserTemplateSelection(data: InsertUserTemplateSelection): Promise<UserTemplateSelection> {
    // Try to update first (most common case for established users)
    const updated = await db.update(userTemplateSelections)
      .set({
        templateId: data.templateId,
        customizations: data.customizations,
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(userTemplateSelections.userId, data.userId))
      .returning();

    if (updated.length > 0) {
      return updated[0];
    }

    // Only create new record if update didn't affect any rows (truly new user)
    const [inserted] = await db
      .insert(userTemplateSelections)
      .values({
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return inserted;
  }

}

export const storage = new DatabaseStorage();