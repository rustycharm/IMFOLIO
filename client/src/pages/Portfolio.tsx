import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import CategoryCarousel from "@/components/CategoryCarousel";
import PortfolioGallery from "@/components/PortfolioGallery";
import { Photo } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Instagram, Twitter, Mail, Link as LinkIcon, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import NotFound from "@/pages/not-found";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { TemplateProvider, useTemplate } from "@/contexts/TemplateContext";

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

function PortfolioInner() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { currentTemplate } = useTemplate();
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
    enabled: !!profile && !!profile.id && currentTemplate?.id !== 'monochrome',
  });

  // Handle photo click for lightbox
  const handlePhotoClick = (
    photo: Photo,
    index: number,
    photos: Photo[]
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
    <div className={`min-h-screen portfolio-template ${currentTemplate?.id ? `template-${currentTemplate.id}` : 'template-classic'}`}>
      
      {/* IMFOLIO Branding Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="text-xl font-light tracking-wider text-gray-800">
              IMFOLIO
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Portfolio
            </div>
          </div>
        </div>
      </header>
      
      {/* Monochrome White Template: Portrait Hero */}
      {currentTemplate?.id === 'monochrome-white' ? (
        <div className="monochrome-white-hero relative bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden pt-20 pb-8">
          {/* Glass morphism backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-gray-50/30 to-gray-100/40 backdrop-blur-sm"></div>
          <div className="container mx-auto h-full px-16 py-12 relative z-10">
            <div className="flex items-center justify-start space-x-12 max-w-5xl ml-8">
              
              {/* Portrait Profile Picture with Enhanced Effects */}
              <div className="relative">
                {/* Soft background glow */}
                <div className="absolute -inset-8 bg-gradient-to-r from-white/60 via-gray-100/40 to-white/60 rounded-lg blur-2xl opacity-70"></div>
                
                {/* Main profile picture container */}
                <div className="relative w-48 h-64 overflow-hidden rounded-lg shadow-2xl border-2 border-white/50 backdrop-blur-sm">
                  {profile.profileImage ? (
                    <>
                      <img 
                        src={profile.profileImage} 
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                      {/* Subtle inner border highlight */}
                      <div className="absolute inset-0 border border-white/30 rounded-lg pointer-events-none"></div>
                      
                      {/* Edge fade effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 pointer-events-none"></div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Extended blur effect behind */}
                {profile.profileImage && (
                  <div 
                    className="absolute -inset-12 opacity-20 blur-3xl -z-10"
                    style={{ 
                      backgroundImage: `url(${profile.profileImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transform: 'scale(1.5)'
                    }}
                  />
                )}
              </div>
              
              {/* Text Content - Left Aligned */}
              <div className="flex-1 text-left">
                <h1 className="text-5xl font-light text-gray-900 tracking-wide leading-tight">
                  {displayName}
                </h1>
                <p className="text-xl text-gray-600 mt-4 font-light">
                  {profile.tagline}
                </p>
              </div>
              
            </div>
          </div>
        </div>
      ) : currentTemplate?.id === 'monochrome' ? (
        <div className="monochrome-hero-section pt-28 pb-4 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-col items-center text-center space-y-4">
              
              {/* Profile Image */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                {profile.profileImage ? (
                  <img 
                    src={profile.profileImage} 
                    alt={displayName}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Camera className="w-12 h-12 text-white/70" />
                  </div>
                )}
              </div>
              
              {/* Name */}
              <h1 className="text-5xl md:text-7xl font-thin tracking-[0.2em] text-white mb-4">
                {displayName}
              </h1>
              
              {/* Tagline */}
              <h2 className="text-xl md:text-2xl font-light tracking-widest text-gray-300 max-w-2xl">
                {profile.tagline || "PHOTOGRAPHY PORTFOLIO"}
              </h2>
              
              {/* About Me */}
              {profile.aboutMe && (
                <div className="max-w-3xl">
                  <p className="text-gray-400 leading-relaxed text-lg font-light whitespace-pre-line">
                    {profile.aboutMe}
                  </p>
                </div>
              )}
              
              {/* Social Links */}
              <div className="flex space-x-6 mt-8">
                {profile.instagram && (
                  <a 
                    href={profile.instagram.startsWith('http') ? profile.instagram : `https://instagram.com/${profile.instagram}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {profile.twitter && (
                  <a 
                    href={profile.twitter.startsWith('http') ? profile.twitter : `https://twitter.com/${profile.twitter}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    <Twitter className="w-6 h-6" />
                  </a>
                )}
                {profile.website && (
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Website"
                    className="text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    <Globe className="w-6 h-6" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Classic Template Hero - Same styling as home page */
        <section className="hero-section h-screen min-h-[100dvh] relative flex items-end justify-center">
          {/* Mobile-first background with Tailwind utilities */}
          <div 
            className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
              isHeroLoading ? 'opacity-0' : 'opacity-100'
            } md:bg-fixed`} 
            style={{ 
              backgroundImage: heroImageData?.url ? `url("${heroImageData.url}")` : 'none',
            }}
          >
            {/* Mobile-first gradient overlay using Tailwind */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 sm:from-black/70 sm:via-black/20 sm:to-transparent"></div>
          </div>

          {/* Container with mobile-first spacing */}
          <div className="container relative z-10 mb-12 sm:mb-16 px-4 sm:px-6 lg:px-8 w-full">
            <div 
              className="max-w-5xl mx-auto text-center"
            >
              {/* Profile picture positioned above the text */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-white rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                  {profile.profileImage ? (
                    <img 
                      src={profile.profileImage} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  )}
                </div>
              </div>
              
              {/* Mobile-first typography with proper Tailwind breakpoints */}
              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-3 sm:mb-4 tracking-tight leading-tight">
                {displayName}
              </h1>
              <p className="text-white/90 text-sm xs:text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-12 font-light px-2 sm:px-0 leading-relaxed">
                {profile.tagline || "PHOTOGRAPHY PORTFOLIO"}
              </p>
              
              {/* Social links */}
              <div className="flex justify-center space-x-6 mt-8">
                {profile.instagram && (
                  <a 
                    href={profile.instagram.startsWith('http') ? profile.instagram : `https://instagram.com/${profile.instagram}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {profile.twitter && (
                  <a 
                    href={profile.twitter.startsWith('http') ? profile.twitter : `https://twitter.com/${profile.twitter}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    <Twitter className="w-6 h-6" />
                  </a>
                )}
                {profile.website && (
                  <a 
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Website"
                    className="text-white/80 hover:text-white transition-colors duration-300"
                  >
                    <Globe className="w-6 h-6" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 z-20 opacity-70 hover:opacity-100 transition-opacity touch-target" 
            style={{
              transform: 'translate(-50%, 0)',
              willChange: 'transform'
            }}>
            <a href="#gallery" className="text-white block p-2" aria-label="Scroll to gallery">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </section>
      )}

      {/* About Section - Only for Classic Template */}
      {currentTemplate?.id !== 'monochrome' && currentTemplate?.id !== 'monochrome-white' && profile.aboutMe && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-light mb-4 text-center">About</h2>
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line text-center">
                {profile.aboutMe}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Category Selection */}
      <div className={`container mx-auto px-4 pt-8 ${currentTemplate?.id === 'monochrome-white' ? 'pb-12' : 'pb-4'}`}>
        <CategoryCarousel
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          variant="standard"
        />
      </div>

      {/* Photo Gallery */}
      <div className="gallery-section container mx-auto px-4 pb-16 overflow-hidden">
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

      {/* About Section - Hidden for monochrome template */}
      {currentTemplate?.id !== 'monochrome' && <About />}

      {/* Contact Section - Hidden for monochrome template */}
      {currentTemplate?.id !== 'monochrome' && <Contact />}

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

// Main Portfolio component with template provider
export default function Portfolio() {
  return (
    <TemplateProvider>
      <PortfolioInner />
    </TemplateProvider>
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