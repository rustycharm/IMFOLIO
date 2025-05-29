import { PhotoResponse } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PortfolioGalleryProps {
  selectedCategory: string;
  onPhotoClick: (photo: PhotoResponse, index: number, photos: PhotoResponse[]) => void;
  setVisiblePhotos: (photos: PhotoResponse[]) => void;
  photos: PhotoResponse[];
  isLoading?: boolean;
}

const PortfolioGallery = ({ 
  selectedCategory, 
  onPhotoClick, 
  setVisiblePhotos, 
  photos,
  isLoading = false 
}: PortfolioGalleryProps) => {
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  
  // Filter and organize photos by category and featured status
  const { displayPhotos, featuredPhotos, regularPhotos } = useMemo(() => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { displayPhotos: [], featuredPhotos: [], regularPhotos: [] };
    }
    
    // Filter by category first
    let filteredPhotos = photos;
    if (selectedCategory !== "all") {
      filteredPhotos = photos.filter(photo => photo.category === selectedCategory);
    }
    
    // Separate featured and regular photos
    const featured = filteredPhotos.filter(photo => photo.featured === true);
    const regular = filteredPhotos.filter(photo => photo.featured !== true);
    
    // For carousel: prioritize featured photos, then regular photos
    const displayOrder = [...featured, ...regular];
    
    return { 
      displayPhotos: displayOrder, 
      featuredPhotos: featured, 
      regularPhotos: regular 
    };
  }, [photos, selectedCategory]);

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
    if (!featuredPhotos || !featuredPhotos.length) return;
    
    if (direction === 'prev') {
      setFeaturedPhotoIndex(prev => 
        prev === 0 ? featuredPhotos.length - 1 : prev - 1
      );
    } else {
      setFeaturedPhotoIndex(prev => 
        prev === featuredPhotos.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <section className="pt-8 pb-24" id="gallery">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          className="text-2xl font-light tracking-wide uppercase mb-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {selectedCategory === "all" ? "All Work" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
        </motion.h2>
        
        {isLoading ? (
          <>
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
              {/* Carousel for featured photos only */}
              {featuredPhotos.length > 0 && (
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
                          src={featuredPhotos[featuredPhotoIndex]?.imageUrl}
                          alt={featuredPhotos[featuredPhotoIndex]?.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                          <div className="p-6 md:p-8 text-white w-full">
                            <h3 className="font-light text-xl md:text-2xl tracking-wide">
                              {featuredPhotos[featuredPhotoIndex]?.title}
                            </h3>
                            <p className="text-sm uppercase tracking-widest mt-2 text-white/80">
                              {featuredPhotos[featuredPhotoIndex]?.category}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    
                    {/* Navigation arrows - only show if there are multiple featured photos */}
                    {featuredPhotos.length > 1 && (
                      <>
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
                        
                        {/* Dots indicator - only show for 5 or fewer photos */}
                        {displayPhotos.length <= 5 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {displayPhotos.map((_, i) => (
                              <button
                                key={i}
                                className={`w-2 h-2 rounded-full transition-all ${
                                  i === featuredPhotoIndex ? 'bg-white w-4' : 'bg-white/50'
                                }`}
                                onClick={() => setFeaturedPhotoIndex(i)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Gallery grid - show all photos */}
              <div className="masonry-grid fade-in">
                {Array.isArray(displayPhotos) && displayPhotos.length > 0 ? (
                  displayPhotos.map((photo: PhotoResponse, index: number) => (
                    <motion.div
                      key={photo.id}
                      className="image-card relative overflow-hidden cursor-pointer mb-4 sm:mb-6 rounded-md shadow-sm"
                      whileHover={{ y: -5 }}
                      onClick={() => onPhotoClick(photo, index, displayPhotos)}
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
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-light tracking-wide text-base sm:text-lg">{photo.title}</h3>
                            {photo.featured && (
                              <span className="text-yellow-300 text-xs font-medium">★</span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-widest mt-1 text-white/80">
                            {photo.category}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 w-full">
                    <p className="text-gray-600">
                      {selectedCategory === "all" 
                        ? "No photos to display." 
                        : `No photos in the ${selectedCategory} category.`}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};

export default PortfolioGallery;