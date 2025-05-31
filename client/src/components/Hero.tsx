import { motion } from "framer-motion";
import type { HeroImage as BackgroundHeroImage } from "@/lib/backgroundImages";
import { FALLBACK_HERO_IMAGE } from "@/lib/backgroundImages";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import CategoryCarousel from "@/components/CategoryCarousel";
import { useQuery } from "@tanstack/react-query";

interface HeroProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

interface LocalHeroImage {
  id: string;
  url: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

const Hero = ({ selectedCategory, onCategoryChange }: HeroProps) => {
  const [heroImage, setHeroImage] = useState<LocalHeroImage | null>(null);
  const [isLoadingHero, setIsLoadingHero] = useState(true);
  const { user, isAuthenticated, isLoading } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Fetch the hero image with improved error handling and caching
  useEffect(() => {
    console.log('Hero useEffect triggered - Auth Loading:', isLoading, 'Authenticated:', isAuthenticated, 'User:', user?.id);
    
    // Don't run if we're still loading auth state
    if (isLoading) {
      console.log('Skipping hero fetch - auth still loading');
      return;
    }
    
    const cacheKey = `hero_image_${isAuthenticated ? `user_${user?.id}` : 'default'}`;

    async function fetchHeroImage() {
      console.log('Starting hero image fetch');
      setIsLoadingHero(true);
      try {
        if (isAuthenticated && user && user.id) {
          // Rule 2: For authenticated users, check if they have a personal hero banner selection
          console.log('Fetching user hero selection for user:', user.id);
          
          const userResponse = await fetch('/api/user/hero-selection', {
            credentials: 'include'
          });
          console.log('User hero selection response received:', userResponse.status, userResponse.ok);
        
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('User hero image response:', userData);
            console.log('Response status:', userResponse.status);
            console.log('Has userData?', !!userData);
            console.log('Has userData.url?', !!(userData && userData.url));
            
            if (userData && userData.url) {
              const imageUrl = userData.url.startsWith('/') ? userData.url : userData.url;
              console.log('Setting user hero image:', { ...userData, url: imageUrl });
              setHeroImage({ ...userData, url: imageUrl });
              setIsLoadingHero(false);
              return;
            } else {
              console.log('User response was OK but no valid data found:', userData);
            }
          } else {
            console.log('User hero selection request failed:', userResponse.status, userResponse.statusText);
          }

          // For authenticated users, fall back to administrator default if no user image
          console.log('No user-specific hero image, fetching administrator default');
          const defaultResponse = await fetch('/api/hero-images/default');
          
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            console.log('Default hero image fetched for authenticated user:', defaultData);

            if (defaultData && defaultData.url) {
              const imageUrl = defaultData.url.startsWith('/') ? defaultData.url : defaultData.url;
              console.log('Setting default hero image for authenticated user:', { ...defaultData, url: imageUrl });
              setHeroImage({ ...defaultData, url: imageUrl });
            } else {
              console.log('No administrator-set hero image available');
              setHeroImage(null);
            }
          }
        } else {
          // For unauthenticated users, ONLY fetch the administrator-set default
          const defaultUrl = `/api/hero-images/default?t=${Date.now()}`;
          console.log(`Fetching administrator default for unauthenticated user: ${defaultUrl}`);
          const defaultResponse = await fetch(defaultUrl);

          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            console.log('Default hero image fetched for unauthenticated user:', defaultData);

            if (defaultData && defaultData.url) {
              const imageUrl = defaultData.url.startsWith('/') ? defaultData.url : defaultData.url;
              console.log('Setting default hero image for unauthenticated user:', { ...defaultData, url: imageUrl });
              setHeroImage({ ...defaultData, url: imageUrl });

              // Store in session storage for faster loading on subsequent visits
              sessionStorage.setItem(cacheKey, JSON.stringify({
                ...defaultData,
                url: imageUrl,
                timestamp: Date.now()
              }));
            } else {
              console.log('No administrator-set hero image available');
              setHeroImage(null);
            }
          } else {
            throw new Error(`Failed to fetch default hero image: ${defaultResponse.status}`);
          }
        }
      } catch (error) {
        console.error('Error fetching hero image:', error);

        // Try to retrieve from session storage for unauthenticated users
        if (!isAuthenticated) {
          const cachedImage = sessionStorage.getItem(cacheKey);
          if (cachedImage) {
            try {
              const parsedImage = JSON.parse(cachedImage);
              setHeroImage(parsedImage);
              console.log('Using cached hero image:', parsedImage);
              setIsLoading(false);
              return;
            } catch (e) {
              console.error('Error parsing cached hero image:', e);
            }
          }
        }

        // NO FALLBACKS - only administrator-set images
        console.log('No administrator-set hero image available');
        setHeroImage(null);
      } finally {
        setIsLoadingHero(false);
      }
    }

    fetchHeroImage();
  }, [isAuthenticated, user, isLoading]);

  // Format photographer name
  const photographerName = !isAuthenticated || !user 
    ? 'IMFOLIO.COM'
    : (user.firstName 
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username.toUpperCase() 
      : 'IMFOLIO.COM');

  return (
    <section className="relative flex items-end justify-center min-h-[600px] h-screen max-h-[100vh] sm:min-h-[700px] md:min-h-[800px]">
      {/* Mobile-optimized background with proper scaling */}
      <div 
        className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`} 
        style={{ 
          backgroundImage: heroImage ? `url("${heroImage.url}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Mobile-first gradient overlay using Tailwind */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 sm:from-black/70 sm:via-black/20 sm:to-transparent"></div>
      </div>

      {/* Container with mobile-first spacing */}
      <div className="container relative z-10 mb-12 sm:mb-16 px-4 sm:px-6 lg:px-8 w-full">
        <motion.div 
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Mobile-first typography with proper Tailwind breakpoints */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white mb-3 sm:mb-4 tracking-tight leading-tight">
            {photographerName}
          </h1>
          <p className="text-white/90 text-sm xs:text-base sm:text-lg md:text-xl mb-6 sm:mb-8 md:mb-12 font-light px-2 sm:px-0 leading-relaxed">
            {isAuthenticated && (user as any)?.tagline ? (user as any).tagline : "YOUR STORY, THROUGH THE LENS"}
          </p>
          {/* Responsive category carousel */}
          <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <CategoryCarousel 
              selectedCategory={selectedCategory} 
              onCategoryChange={onCategoryChange}
              variant="hero"
            />
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator with mobile-optimized positioning */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 z-20 opacity-70 hover:opacity-100 transition-opacity touch-target" 
        style={{
          transform: `translate(-50%, ${Math.min(30, scrollY * 0.1)}px)`,
          willChange: 'transform'
        }}>
        <a href="#gallery" className="text-white block p-2" aria-label="Scroll to gallery">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </section>
  );
};

export default Hero;