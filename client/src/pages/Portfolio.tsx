import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import CategoryCarousel from "@/components/CategoryCarousel";
import PortfolioGallery from "@/components/PortfolioGallery";
import { Photo } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Instagram, Twitter, Mail, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import NotFound from "@/pages/not-found";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { TemplateProvider } from "@/contexts/TemplateContext";

type PhotographerProfile = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  heroImage: string;
  tagline: string;
  aboutMe: string;
  email: string | null;
  instagram: string | null;
  twitter: string | null;
  website: string | null;
};

export default function Portfolio() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visiblePhotos, setVisiblePhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Fetch photographer profile
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["/api/portfolio", username],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${username}`);
      if (!response.ok) {
        throw new Error("Failed to fetch photographer profile");
      }
      return response.json() as Promise<PhotographerProfile>;
    },
  });

  // Fetch photographer's photos
  const {
    data: photos,
    isLoading: isPhotosLoading,
    error: photosError,
  } = useQuery({
    queryKey: ["/api/portfolio", username, "photos"],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/${username}/photos`);
      if (!response.ok) {
        throw new Error("Failed to fetch photographer photos");
      }
      return response.json() as Promise<Photo[]>;
    },
    enabled: !!profile,
  });

  // Fetch photographer's selected hero image (inherit from their account settings)
  const { data: heroImageData, isLoading: isHeroLoading } = useQuery({
    queryKey: ["/api/portfolio/hero", profile?.id, currentUser?.id],
    queryFn: async () => {
      console.log('Portfolio hero fetch for profile:', profile?.id, 'current user:', currentUser?.id);
      
      if (!profile?.id) {
        console.log('No profile ID, using default');
        const defaultResponse = await fetch('/api/hero-images/default');
        return defaultResponse.ok ? defaultResponse.json() : null;
      }

      // Check if the current authenticated user is viewing their own portfolio
      const isOwnPortfolio = isAuthenticated && currentUser && String(currentUser.id) === String(profile.id);
      console.log('Is own portfolio?', isOwnPortfolio, 'User ID:', currentUser?.id, 'Profile ID:', profile.id);

      if (isOwnPortfolio) {
        // If user is viewing their own portfolio, use the existing working authenticated endpoint
        console.log('Using authenticated hero selection endpoint for own portfolio');
        try {
          const response = await fetch('/api/user/hero-selection', {
            credentials: 'include'
          });
          if (response.ok) {
            const heroData = await response.json();
            console.log('Portfolio got own hero selection:', heroData);
            return heroData;
          }
        } catch (error) {
          console.log('Portfolio own hero error:', error);
        }
      }

      // For other users' portfolios or when not authenticated, use default for now
      console.log('Portfolio falling back to default (other user or not authenticated)');
      const defaultResponse = await fetch('/api/hero-images/default');
      return defaultResponse.ok ? defaultResponse.json() : null;
    },
    enabled: !!profile && !!profile.id,
  });

  // Handle photo click for lightbox
  const handlePhotoClick = (
    photo: PhotoResponse,
    index: number,
    photos: PhotoResponse[]
  ) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
  };

  // Next/previous photo handlers
  const handleNextPhoto = () => {
    if (!visiblePhotos || visiblePhotos.length === 0) return;
    const newIndex = (selectedIndex + 1) % visiblePhotos.length;
    setSelectedIndex(newIndex);
    setSelectedPhoto(visiblePhotos[newIndex]);
  };

  const handlePrevPhoto = () => {
    if (!visiblePhotos || visiblePhotos.length === 0) return;
    const newIndex =
      (selectedIndex - 1 + visiblePhotos.length) % visiblePhotos.length;
    setSelectedIndex(newIndex);
    setSelectedPhoto(visiblePhotos[newIndex]);
  };

  // Handle lightbox close
  const handleCloseLightbox = () => {
    setSelectedPhoto(null);
  };

  // Check if loading or error
  if (isProfileLoading) {
    return <PortfolioSkeleton />;
  }

  if (profileError || !profile) {
    return <NotFound />;
  }

  // Prepare display name
  const displayName = profile.firstName && profile.lastName 
    ? `${profile.firstName} ${profile.lastName}` 
    : profile.username;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner - Inherited from photographer's account settings */}
      <div
        className="relative w-full h-[60vh] bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroImageData?.url || (profile?.heroImage ? `/api/hero-images/user/${profile.id}` : '')})`,
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-center items-center text-white px-4">
          <div className="flex flex-col items-center max-w-3xl text-center">
            <div className="w-24 h-24 border-2 border-white mb-6 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
              {profile.profileImage ? (
                <img 
                  src={profile.profileImage} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-light tracking-wider mb-2">
              {displayName}
            </h1>
            
            <h2 className="text-xl md:text-2xl font-extralight tracking-widest mb-6">
              {profile.tagline || "PHOTOGRAPHY PORTFOLIO"}
            </h2>
            
            <div className="flex space-x-4 mt-2">
              {profile.instagram && (
                <a 
                  href={profile.instagram.startsWith('http') ? profile.instagram : `https://instagram.com/${profile.instagram}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-white hover:text-primary-300 transition-colors"
                >
                  <Instagram size={20} />
                </a>
              )}
              
              {profile.twitter && (
                <a 
                  href={profile.twitter.startsWith('http') ? profile.twitter : `https://twitter.com/${profile.twitter}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-white hover:text-primary-300 transition-colors"
                >
                  <Twitter size={20} />
                </a>
              )}
              
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Website"
                  className="text-white hover:text-primary-300 transition-colors"
                >
                  <LinkIcon size={20} />
                </a>
              )}
              
              {profile.email && (
                <a 
                  href={`mailto:${profile.email}`} 
                  aria-label="Email"
                  className="text-white hover:text-primary-300 transition-colors"
                >
                  <Mail size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      {profile.aboutMe && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-light mb-4 text-center">About</h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {profile.aboutMe}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Category Selection */}
      <div className="container mx-auto px-4 py-8">
        <CategoryCarousel
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          variant="standard"
        />
      </div>

      {/* Photo Gallery */}
      <div className="container mx-auto px-4 pb-16">
        {isPhotosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        ) : photosError || !photos ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              Unable to load photos. Please try again later.
            </p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No photos to display.</p>
          </div>
        ) : (
          <PortfolioGallery
            selectedCategory={selectedCategory}
            onPhotoClick={handlePhotoClick}
            setVisiblePhotos={setVisiblePhotos}
            photos={photos}
            isLoading={isPhotosLoading}
          />
        )}
      </div>

      {/* About Section */}
      <About />

      {/* Contact Section */}
      <Contact />

      {/* Footer */}
      <Footer />

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={!!selectedPhoto}
        photos={visiblePhotos}
        currentIndex={selectedIndex}
        onClose={handleCloseLightbox}
        onNavigate={(direction) => {
          if (direction === 'next') handleNextPhoto();
          else handlePrevPhoto();
        }}
      />
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner Skeleton */}
      <div className="relative w-full h-[60vh]">
        <Skeleton className="w-full h-full" />
      </div>

      {/* About Section Skeleton */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-40 mx-auto mb-4" />
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </section>

      {/* Category Selection Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Photo Gallery Skeleton */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square">
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}