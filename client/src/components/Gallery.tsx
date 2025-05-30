import { useQuery } from "@tanstack/react-query";
import { PhotoResponse } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface GalleryProps {
  selectedCategory: string;
  onPhotoClick: (photo: PhotoResponse, index: number, photos: PhotoResponse[]) => void;
  setVisiblePhotos: (photos: PhotoResponse[]) => void;
}

const Gallery = ({ selectedCategory, onPhotoClick, setVisiblePhotos }: GalleryProps) => {
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  const { isAuthenticated } = useAuth();

  const { data: photos, isLoading, error } = useQuery({
    queryKey: [
      isAuthenticated ? "/api/user/photos" : "/api/photos",
      selectedCategory,
      isAuthenticated ? "user" : "public"
    ],
    queryFn: async () => {
      if (isAuthenticated) {
        // For logged-in users, fetch their photos from user endpoint
        const response = await fetch('/api/user/photos');
        if (!response.ok) throw new Error('Failed to fetch user photos');
        const userPhotos = await response.json();
        // Return only public photos for home page display
        return userPhotos.filter((photo: any) => photo.isPublic === true);
      } else {
        // For non-logged-in users, fetch featured photos from public endpoint
        const params = new URLSearchParams();
        if (selectedCategory === "all") params.append("featured", "true");
        if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);

        const response = await fetch(`/api/photos?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch photos');
        return response.json();
      }
    }
  });

  // Organize photos: featured first, then regular photos
  const { displayPhotos, featuredPhotos } = useMemo(() => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { displayPhotos: [], featuredPhotos: [] };
    }

    if (isAuthenticated) {
      // For logged-in users: filter by category first, then separate featured and regular photos
      let filteredPhotos = photos;
      if (selectedCategory !== "all") {
        filteredPhotos = photos.filter(photo => photo.category && photo.category === selectedCategory);
      }
      
      const featured = filteredPhotos.filter(photo => photo.featured === true);
      const regular = filteredPhotos.filter(photo => photo.featured !== true);
      
      return { 
        displayPhotos: [...featured, ...regular], 
        featuredPhotos: featured 
      };
    } else {
      // For non-logged-in users: show featured photos from all users
      if (selectedCategory === "all") {
        // Keep the first photo at the top for the carousel
        const firstPhoto = photos[0];

        // Randomize the rest
        const remainingPhotos = [...photos.slice(1)];
        for (let i = remainingPhotos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remainingPhotos[i], remainingPhotos[j]] = [remainingPhotos[j], remainingPhotos[i]];
        }

        return { displayPhotos: [firstPhoto, ...remainingPhotos], featuredPhotos: photos };
      }

      return { displayPhotos: photos, featuredPhotos: photos };
    }
  }, [photos, selectedCategory, isAuthenticated]);

  useEffect(() => {
    if (displayPhotos && Array.isArray(displayPhotos)) {
      setVisiblePhotos(displayPhotos);
    }
  }, [displayPhotos, setVisiblePhotos]);

  // Reset carousel index when category changes
  useEffect(() => {
    setFeaturedPhotoIndex(0);
  }, [selectedCategory]);

  const navigateCarousel = (direction: 'prev' | 'next') => {
    const carouselPhotos = isAuthenticated ? featuredPhotos : displayPhotos;
    if (!carouselPhotos || !carouselPhotos.length) return;

    if (direction === 'prev') {
      setFeaturedPhotoIndex(prev => 
        prev === 0 ? carouselPhotos.length - 1 : prev - 1
      );
    } else {
      setFeaturedPhotoIndex(prev => 
        prev === carouselPhotos.length - 1 ? 0 : prev + 1
      );
    }
  };

  if (error) {
    return (
      <section className="py-12 mt-20" id="gallery">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-red-500">
            <p>Error loading photos. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-16 pb-24" id="gallery">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          className="text-2xl font-light tracking-wide uppercase mb-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {selectedCategory === "all" ? "Featured Work" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
        </motion.h2>

        {isLoading ? (
          <>
            {/* Skeleton for carousel */}
            {selectedCategory === "all" && (
              <div className="mb-12">
                <Skeleton className="w-full h-[280px] sm:h-[400px] md:h-[500px] rounded-lg aspect-[16/9]" />
              </div>
            )}
            <div className="masonry-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="overflow-hidden">
                  <Skeleton className="w-full h-[300px] md:h-[400px]" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Full width featured carousel for the homepage */}
              {selectedCategory === "all" && (isAuthenticated ? featuredPhotos.length > 0 : displayPhotos.length > 0) && (
                <div className="relative mb-16 rounded-lg overflow-hidden shadow-lg">
                  <div className="w-full aspect-[16/9] relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={featuredPhotoIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                      >
                        <img
                          src={(isAuthenticated ? featuredPhotos : displayPhotos)[featuredPhotoIndex]?.imageUrl}
                          alt={(isAuthenticated ? featuredPhotos : displayPhotos)[featuredPhotoIndex]?.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                          <div className="p-6 md:p-8 text-white w-full">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <h3 className="font-light text-xl md:text-2xl tracking-wide">
                                {(isAuthenticated ? featuredPhotos : displayPhotos)[featuredPhotoIndex]?.title}
                              </h3>
                              {displayPhotos[featuredPhotoIndex]?.photographer && (
                                <span className="text-sm text-white/80 normal-case">
                                  by <span className="font-medium">{displayPhotos[featuredPhotoIndex]?.photographer}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm uppercase tracking-widest mt-2 text-white/80">
                              {displayPhotos[featuredPhotoIndex]?.category}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation arrows */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10"
                      onClick={() => navigateCarousel('prev')}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full w-10 h-10"
                      onClick={() => navigateCarousel('next')}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {displayPhotos.slice(0, 5).map((_, i) => (
                        <button
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === featuredPhotoIndex ? 'bg-white w-4' : 'bg-white/50'
                          }`}
                          onClick={() => setFeaturedPhotoIndex(i)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Regular gallery grid - show all photos except the first one on homepage */}
              <div className="masonry-grid fade-in">
                {Array.isArray(displayPhotos) && displayPhotos
                  .slice(selectedCategory === "all" ? 1 : 0) // Skip the first photo on homepage as it's shown in the carousel
                  .map((photo: PhotoResponse, index: number) => (
                    <motion.div
                      key={photo.id}
                      className="image-card relative overflow-hidden cursor-pointer mb-4 sm:mb-6 rounded-md shadow-sm"
                      whileHover={{ y: -5 }}
                      onClick={() => onPhotoClick(photo, selectedCategory === "all" ? index + 1 : index, displayPhotos)}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.5,
                        delay: index * 0.05
                      }}
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-auto object-cover aspect-[4/3] sm:aspect-auto"
                        loading="lazy"
                      />
                      <div className="overlay absolute inset-0 bg-black bg-opacity-20 sm:bg-opacity-0 sm:hover:bg-opacity-40 transition-all flex items-end opacity-100 sm:opacity-0 sm:hover:opacity-100">
                        <div className="p-3 sm:p-5 text-white w-full">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <h3 className="font-light tracking-wide text-base sm:text-lg">{photo.title}</h3>
                            {photo.photographer && (
                              <span className="text-xs text-white/80 normal-case">
                                by <span className="font-medium">{photo.photographer}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-widest mt-1 text-white/80">
                            {photo.category}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                }
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default Gallery;