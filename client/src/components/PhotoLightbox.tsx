import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
interface PhotoResponse {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  photographer?: string;
  photographerUsername?: string;
  tags?: string[];
}

interface PhotoLightboxProps {
  isOpen: boolean;
  photos: PhotoResponse[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export const PhotoLightbox = ({
  isOpen,
  photos,
  currentIndex,
  onClose,
  onNavigate
}: PhotoLightboxProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const currentPhoto = photos[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('next');
          break;
        case 'i':
        case 'I':
          setShowInfo(!showInfo);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onNavigate, showInfo]);

  // Reset image loaded state when photo changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  // Handle image load to get dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageLoaded(true);
  };

  // Determine if image is portrait or landscape
  const isPortrait = imageDimensions.height > imageDimensions.width;

  if (!isOpen || !currentPhoto) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background overlay */}
        <div 
          className="absolute inset-0 bg-black cursor-pointer"
          onClick={onClose}
        />

        {/* Navigation Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={() => setShowInfo(!showInfo)}
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-12 w-12"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Photo counter */}
        <div className="absolute top-4 left-4 z-20 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Previous/Next buttons */}
        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-14 w-14"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('prev');
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20 h-14 w-14"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('next');
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Main image container */}
        <div className="relative w-full h-full flex items-center justify-center p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhoto.id}
              className="relative flex items-center justify-center"
              style={{
                width: '100%',
                height: '100%',
                maxWidth: 'calc(100vw - 4rem)',
                maxHeight: 'calc(100vh - 4rem)'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
            >
              {/* Loading skeleton */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-800 animate-pulse rounded" />
              )}
              
              <img
                src={currentPhoto.imageUrl}
                alt={currentPhoto.title}
                className={`
                  object-contain cursor-pointer transition-opacity duration-300
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                `}
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
                onLoad={handleImageLoad}
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Photo information panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6 text-white"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-light mb-2">{currentPhoto.title}</h2>
                {currentPhoto.description && (
                  <p className="text-gray-300 mb-3">{currentPhoto.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  {currentPhoto.category && (
                    <span className="uppercase tracking-wider">{currentPhoto.category}</span>
                  )}
                  {currentPhoto.photographer && (
                    <span>by {currentPhoto.photographer}</span>
                  )}
                  {currentPhoto.tags && currentPhoto.tags.length > 0 && (
                    <div className="flex gap-2">
                      {currentPhoto.tags.map((tag: string, index: number) => (
                        <span key={index} className="bg-white/10 px-2 py-1 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 right-4 z-20 text-white/60 text-xs bg-black/50 px-3 py-2 rounded">
          Press ESC to close • ← → to navigate • I for info
        </div>
      </motion.div>
    </AnimatePresence>
  );
};