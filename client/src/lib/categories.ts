// Shared list of photo categories across the application
export const photoCategories = [
  { id: "all", label: "All" },
  { id: "landscapes", label: "Landscapes" },
  { id: "portraits", label: "Portraits" },
  { id: "artistic", label: "Artistic" },
  { id: "nature", label: "Nature" },
  { id: "street", label: "Street" },
  { id: "architecture", label: "Architecture" },
  { id: "travel", label: "Travel" },
  { id: "macro", label: "Macro" },
  { id: "black-and-white", label: "Black & White" },
  { id: "other", label: "Other" }
];

// Function to get system categories (cannot be deleted)
export function getSystemCategories() {
  return photoCategories;
}

// Helper function to convert a string to a valid category ID
export function createCategoryId(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}