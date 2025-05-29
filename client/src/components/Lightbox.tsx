import { useEffect } from "react";
import { PhotoResponse } from "@shared/schema";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LightboxProps {
  photo: PhotoResponse;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const Lightbox = ({ photo, onClose, onNext, onPrev }: LightboxProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        onNext();
      } else if (e.key === "ArrowLeft") {
        onPrev();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Prevent scrolling when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose, onNext, onPrev]);

  return (
    <AnimatePresence>
      <motion.div
        className="lightbox fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0" onClick={onClose}></div>
        
        {/* Navigation Controls */}
        <div className="absolute inset-x-0 top-0 flex justify-between items-center p-6 z-20">
          <div></div> {/* Empty div for spacing */}
          <button
            className="text-white bg-black/30 hover:bg-black/50 transition-colors w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            onClick={(e) => {
              e.stopPropagation(); // Prevent event from propagating to background
              onClose();
            }}
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="absolute inset-y-0 left-0 flex items-center z-20">
          <button
            className="text-white/70 hover:text-white transition-colors w-20 h-20 flex items-center justify-center"
            onClick={onPrev}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        </div>
        
        <div className="absolute inset-y-0 right-0 flex items-center z-20">
          <button
            className="text-white/70 hover:text-white transition-colors w-20 h-20 flex items-center justify-center"
            onClick={onNext}
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
        
        <div className="relative z-10 max-w-7xl max-h-screen px-4 select-none">
          <motion.img
            key={photo.id}
            src={photo.imageUrl}
            alt={photo.title}
            className="max-h-[92vh] max-w-full mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            draggable="false"
          />
          
          <motion.div 
            className="text-white mt-6 text-center px-4 absolute bottom-8 left-0 right-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h3 className="text-xl font-light tracking-wide">{photo.title}</h3>
            <p className="text-xs uppercase tracking-widest mt-2 text-white/70">
              {photo.category}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Lightbox;
