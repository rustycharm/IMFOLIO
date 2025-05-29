import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from './auth';

// Define a fixed upload path relative to current working directory
const UPLOAD_DIR = 'uploads/profile-images';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// Only allow image file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
}).single('profileImage');

// Handle profile image upload
export async function updateProfileImage(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Handle the file upload using multer
    upload(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // A Multer error occurred during upload
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else {
          // Other errors
          return res.status(400).json({ message: err.message });
        }
      }

      // If no file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Get the uploaded file path and convert to URL path
      const userId = req.session.userId;
      const fileName = req.file.filename;
      const imageUrl = `/uploads/profile-images/${fileName}`;
      
      console.log(`Uploaded profile image ${fileName} for user ${userId}, URL: ${imageUrl}`);

      // Update the user's profile image in the database
      const [updatedUser] = await db
        .update(users)
        .set({ 
          profileImage: imageUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ profileImage: users.profileImage });

      return res.status(200).json({ 
        message: 'Profile image updated successfully',
        imageUrl: updatedUser.profileImage
      });
    });
  } catch (error) {
    console.error('Error updating profile image:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Handle profile image deletion
export async function deleteProfileImage(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = req.session.userId;

    // Get current profile image
    const [user] = await db
      .select({ profileImage: users.profileImage })
      .from(users)
      .where(eq(users.id, userId));

    if (user && user.profileImage) {
      // Delete the file from the server
      const filePath = path.join(__dirname, '..', user.profileImage);
      
      // Check if file exists before attempting to delete
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Update the database to remove the profile image reference
    await db
      .update(users)
      .set({ 
        profileImage: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return res.status(200).json({ message: 'Profile image removed successfully' });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}