import { apiRequest } from "@/lib/queryClient";
import { InsertPhoto } from "@shared/schema";

// Mock service for Photo integration
export async function syncPhotosFromService(service: 'apple' | 'google'): Promise<boolean> {
  try {
    const response = await apiRequest('POST', '/api/photos/sync', { service });
    const data = await response.json();
    
    return data.success;
  } catch (error) {
    console.error('Error syncing photos:', error);
    return false;
  }
}

// Add a new photo (would be called during sync process)
export async function addPhoto(photo: InsertPhoto): Promise<any> {
  try {
    const response = await apiRequest('POST', '/api/photos', photo);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error adding photo:', error);
    throw error;
  }
}

// Get all photos
export async function getAllPhotos(): Promise<any[]> {
  try {
    const response = await fetch('/api/photos');
    if (!response.ok) {
      throw new Error('Failed to fetch photos');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

// Get photos by category
export async function getPhotosByCategory(category: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/photos?category=${category}`);
    if (!response.ok) {
      throw new Error('Failed to fetch photos by category');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching photos by category:', error);
    return [];
  }
}
