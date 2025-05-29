// Define the hero image type that matches the backend schema
export type HeroImage = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  isActive?: boolean;
  isDefault?: boolean;
};

// No fallbacks - only use authentic data from database