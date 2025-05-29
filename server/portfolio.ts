import { Request, Response } from "express";
import { db } from "./db";
import { users, photos, profiles } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { log } from "./vite";

/**
 * Get a photographer's profile by username
 */
export async function getPhotographerProfile(req: Request, res: Response) {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    log(`Fetching photographer profile for username: ${username}`);
    
    // Query the user and their profile information
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        email: users.email,
        // These are in the profiles table, not users table
        heroImage: profiles.heroImage,
        tagline: profiles.tagline,
        aboutMe: profiles.bio,
        instagram: profiles.instagram,
        twitter: profiles.twitter,
        website: profiles.website
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(users.username, username));
    
    if (!user) {
      return res.status(404).json({ message: "Photographer not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Error fetching photographer profile:", error);
    res.status(500).json({ message: "Failed to fetch photographer profile" });
  }
}

/**
 * Get a photographer's public photos by username
 */
export async function getPhotographerPhotos(req: Request, res: Response) {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }
    
    log(`Fetching public photos for photographer username: ${username}`);
    
    // First get the user ID from username
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));
    
    if (!user) {
      return res.status(404).json({ message: "Photographer not found" });
    }
    
    // Then get their public photos
    const photographerPhotos = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.userId, user.id),
          eq(photos.isPublic, true)
        )
      );
    
    res.json(photographerPhotos);
  } catch (error) {
    console.error("Error fetching photographer photos:", error);
    res.status(500).json({ message: "Failed to fetch photographer photos" });
  }
}