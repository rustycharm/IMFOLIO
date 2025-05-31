import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profiles table - separate from Replit Auth for customizable information
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  username: varchar("username").unique(), // Custom username (separate from Replit)
  firstName: varchar("first_name"), // User-customizable first name
  lastName: varchar("last_name"), // User-customizable last name
  tagline: text("tagline"),
  bio: text("bio"),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  twitter: text("twitter"),
  portfolioUrlType: text("portfolio_url_type").notNull(), // "username", "fullname_dash", "fullname_dot", or "id"
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Photos table - using Replit user IDs
export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  category: text("category"),
  tags: text("tags").array(), // AI-generated tags as array
  location: text("location"), // AI-detected location
  altText: text("alt_text"), // AI-generated alt text for accessibility
  keywords: text("keywords"), // AI-generated keywords for SEO
  fileKey: text("file_key"), // Object storage file key
  fileHash: varchar("file_hash"), // MD5 hash for duplicate detection
  isPublic: boolean("is_public").default(false).notNull(), // PRIVACY FIRST: Photos default to private
  featured: boolean("featured").default(false).notNull(),
  sourceProvider: text("source_provider"),
  externalId: text("external_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages table - for contact form submissions
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name"),
  email: text("email"),
  subject: text("subject"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Hero images table
export const heroImages = pgTable("hero_images", {
  id: varchar("id").primaryKey(),
  url: text("url"),
  name: text("name"),
  description: text("description"),
  addedBy: varchar("added_by"),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  title: text("title"),
  imageUrl: text("image_url"),
  uploadedAt: timestamp("uploaded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  userId: varchar("user_id"),
  imageType: text("image_type"),
  // Color palette extraction fields
  dominantColor: varchar("dominant_color"), // Primary dominant color (hex)
  colorPalette: jsonb("color_palette"), // Array of extracted colors with percentages
  colorAnalysisComplete: boolean("color_analysis_complete").default(false).notNull(),
  colorExtractedAt: timestamp("color_extracted_at"),
});

// User hero selections table - for photographers to choose their personal hero banner
export const userHeroSelections = pgTable("user_hero_selections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  heroImageId: varchar("hero_image_id").references(() => heroImages.id),
  customImageUrl: text("custom_image_url"),
  customImageTitle: text("custom_image_title"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Storage usage tracking table - for admin metrics and storage monitoring
export const storageUsage = pgTable("storage_usage", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  fileKey: text("file_key").notNull(), // Object storage key
  originalFilename: text("original_filename"),
  compressedSize: text("compressed_size").notNull(), // Actual stored file size in bytes
  imageType: varchar("image_type").notNull(), // 'photo', 'hero', 'profile'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Portfolio templates table - system-defined design templates
export const portfolioTemplates = pgTable("portfolio_templates", {
  id: varchar("id").primaryKey(), // e.g., 'monochrome', 'classic', 'modern'
  name: text("name").notNull(), // Display name
  description: text("description"), // Template description
  category: text("category").notNull(), // 'minimal', 'artistic', 'commercial', etc.
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  // Template styling configuration
  colorScheme: jsonb("color_scheme").notNull(), // Primary colors, backgrounds, text colors
  typography: jsonb("typography").notNull(), // Font families, weights, sizes
  layout: jsonb("layout").notNull(), // Gallery layout, spacing, component arrangements
  effects: jsonb("effects"), // Animations, transitions, hover effects
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User template selections table - tracks which template each user is using
export const userTemplateSelections = pgTable("user_template_selections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  templateId: varchar("template_id").references(() => portfolioTemplates.id).notNull(),
  customizations: jsonb("customizations"), // Future: user-specific overrides
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertUserHeroSelectionSchema = createInsertSchema(userHeroSelections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStorageUsageSchema = createInsertSchema(storageUsage).omit({
  id: true,
  createdAt: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertPortfolioTemplateSchema = createInsertSchema(portfolioTemplates).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserTemplateSelectionSchema = createInsertSchema(userTemplateSelections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type HeroImage = typeof heroImages.$inferSelect;
export type UserHeroSelection = typeof userHeroSelections.$inferSelect;
export type StorageUsage = typeof storageUsage.$inferSelect;
export type PortfolioTemplate = typeof portfolioTemplates.$inferSelect;
export type UserTemplateSelection = typeof userTemplateSelections.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertUserHeroSelection = z.infer<typeof insertUserHeroSelectionSchema>;
export type InsertStorageUsage = z.infer<typeof insertStorageUsageSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type InsertPortfolioTemplate = z.infer<typeof insertPortfolioTemplateSchema>;
export type InsertUserTemplateSelection = z.infer<typeof insertUserTemplateSelectionSchema>;