import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate portfolio URL based on user preference
export function generatePortfolioUrl(user: any): string {
  if (!user) return '/';
  
  const urlType = user.portfolioUrlType;
  const username = user.username;
  const firstName = user.firstName;
  const lastName = user.lastName;
  const userId = user.id;
  
  switch (urlType) {
    case 'username':
      return `/${username || userId}`;
    case 'fullname_dash':
      if (firstName && lastName) {
        return `/${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
      }
      return username ? `/${username}` : `/${userId}`;
    case 'fullname_dot':
      if (firstName && lastName) {
        return `/${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      }
      return username ? `/${username}` : `/${userId}`;
    case 'replit_id':
      return `/${userId}`;
    default:
      return username ? `/${username}` : `/${userId}`;
  }
}
