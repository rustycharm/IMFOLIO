import { Photo } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTemplate } from "@/contexts/TemplateContext";

interface PortfolioGalleryProps {
  selectedCategory: string;
  onPhotoClick: (photo: Photo, index: number, photos: Photo[]) => void;
  setVisiblePhotos: (photos: Photo[]) => void;
  photos: Photo[];
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
  const { currentTemplate } = useTemplate();
  const isMonochromeTemplate = currentTemplate?.id === 'monochrome';
  
  // Filter and organize photos by category and featured status
  const { displayPhotos, featuredPhotos, regularPhotos } = useMemo(() => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return { displayPhotos: [], featuredPhotos: [], regularPhotos: [] };
    }
    
    // Filter by category first
    let filteredPhotos = photos;
    if (selectedCategory !== "all") {
      filteredPhotos = photos.filter(photo => photo.category && photo.category === selectedCategory);
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
  }, [photos, selectedCategory, isMonochromeTemplate]);

  useEffect(() => {
    if (displayPhotos && Array.isArray(displayPhotos)) {
      setVisiblePhotos(displayPhotos);
    }
  }, [displayPhotos, setVisiblePhotos]);

  // Reset carousel index when category changes - only for classic template
  useEffect(() => {
    if (!isMonochromeTemplate) {
      setFeaturedPhotoIndex(0);
    }
  }, [selectedCategory, isMonochromeTemplate]);

  // Carousel navigation function - only for classic template
  const navigateCarousel = (direction: 'prev' | 'next') => {
    if (isMonochromeTemplate || !featuredPhotos || !featuredPhotos.length) return;
    
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
    <section className="pb-24" id="gallery">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Show title at top for classic template */}
        {!isMonochromeTemplate && (
          <motion.h2 
            className="text-2xl font-light tracking-wide uppercase mb-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {selectedCategory === "all" ? "All Work" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
          </motion.h2>
        )}
        
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
              {/* Classic Template: Legacy Carousel */}
              {featuredPhotos.length > 0 && !isMonochromeTemplate && (
                <>
                  <motion.h3 
                    className="text-2xl font-light tracking-wide uppercase mb-8 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                  >
                    Featured Work
                  </motion.h3>
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
                </>
              )}
              
              {/* Monochrome Template: Featured Spotlight Layout */}
              {isMonochromeTemplate && featuredPhotos.length > 0 && (
                <div className="monochrome-featured-section mb-16 mt-2">
                  <motion.h3 
                    className="text-3xl font-thin text-center mb-8 tracking-widest uppercase"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    Featured Works
                  </motion.h3>
                  
                  {/* Main featured photo spotlight */}
                  <div className="relative w-full h-[70vh] mb-8 overflow-hidden">
                    <motion.img
                      key={featuredPhotos[featuredPhotoIndex]?.id}
                      src={featuredPhotos[featuredPhotoIndex]?.imageUrl}
                      alt={featuredPhotos[featuredPhotoIndex]?.title || "Featured photo"}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => onPhotoClick(featuredPhotos[featuredPhotoIndex], featuredPhotoIndex, featuredPhotos)}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                    
                    {/* Featured photo overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Featured photo title */}
                    <div className="absolute bottom-8 left-8 text-white">
                      <motion.h4 
                        className="text-2xl font-thin tracking-wide mb-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      >
                        {featuredPhotos[featuredPhotoIndex]?.title}
                      </motion.h4>

                    </div>
                    
                    {/* Star indicator */}
                    <div className="absolute top-8 right-8">
                      <Star className="w-6 h-6 text-white fill-white" />
                    </div>
                    
                    {/* Navigation arrows for featured photos */}
                    {featuredPhotos.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-none"
                          onClick={() => setFeaturedPhotoIndex(prev => prev === 0 ? featuredPhotos.length - 1 : prev - 1)}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white border-none"
                          onClick={() => setFeaturedPhotoIndex(prev => prev === featuredPhotos.length - 1 ? 0 : prev + 1)}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Featured photo thumbnails */}
                  {featuredPhotos.length > 1 && (
                    <div className="flex justify-center space-x-4 mb-12">
                      {featuredPhotos.map((photo, index) => (
                        <motion.div
                          key={photo.id}
                          className={`w-20 h-20 cursor-pointer border-2 transition-all duration-300 ${
                            index === featuredPhotoIndex 
                              ? 'border-white shadow-lg' 
                              : 'border-gray-600 hover:border-gray-400'
                          }`}
                          onClick={() => setFeaturedPhotoIndex(index)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <img
                            src={photo.imageUrl}
                            alt={photo.title || "Featured thumbnail"}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Title for monochrome template - above photo river */}
              {isMonochromeTemplate && (
                <motion.h2 
                  className="text-3xl font-thin tracking-widest uppercase mb-12 text-center text-white"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  {selectedCategory === "all" ? "All Work" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                </motion.h2>
              )}

              {/* Gallery grid */}
              <div className={isMonochromeTemplate ? "monochrome-grid" : "masonry-grid fade-in"}>
                {Array.isArray(displayPhotos) && displayPhotos.length > 0 ? (
                  displayPhotos.map((photo: Photo, index: number) => (
                    <motion.div
                      key={photo.id}
                      className={`image-card relative overflow-hidden cursor-pointer transition-transform duration-300 hover:transform ${
                        isMonochromeTemplate 
                          ? 'mb-8 hover:-translate-y-3' 
                          : 'mb-4 sm:mb-6 rounded-md shadow-sm hover:-translate-y-1'
                      }`}
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