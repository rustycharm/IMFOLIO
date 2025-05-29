import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { photoCategories } from "@/lib/categories";
import { motion } from "framer-motion";

interface CategoryCarouselProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  variant?: "hero" | "standard";
}

const CategoryCarousel = ({ 
  selectedCategory, 
  onCategoryChange,
  variant = "standard"
}: CategoryCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check if carousel needs arrows based on overflow
  const checkForArrows = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
  };

  // Handle carousel scroll
  const scroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    
    const { clientWidth } = carouselRef.current;
    const scrollAmount = clientWidth * 0.75;
    
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Handle window resize and initial check
  useEffect(() => {
    checkForArrows();
    window.addEventListener("resize", checkForArrows);
    return () => window.removeEventListener("resize", checkForArrows);
  }, []);

  // Get button styles based on variant
  const getButtonStyles = (categoryId: string) => {
    const isSelected = selectedCategory === categoryId;
    
    if (variant === "hero") {
      return `
        text-white text-sm sm:text-base py-2 sm:py-3 px-3 sm:px-4 
        border-white/30 hover:bg-white/10 font-light tracking-wide
        ${isSelected ? "border-white bg-white/10" : "border"}
      `;
    }
    
    return `
      bg-white dark:bg-gray-800 
      border-gray-200 dark:border-gray-700 
      hover:bg-gray-100 dark:hover:bg-gray-700
      font-light tracking-wide text-sm
      ${isSelected ? "bg-gray-100 dark:bg-gray-700 border-primary dark:border-primary" : ""}
    `;
  };

  return (
    <div className="relative w-full">
      {/* Left arrow */}
      {showLeftArrow && (
        <motion.div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => scroll("left")} 
            className={variant === "hero" ? "text-white bg-black/20 hover:bg-black/40 p-1" : ""}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
      
      {/* Category buttons */}
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto gap-2 sm:gap-3 px-1 py-2 custom-scrollbar"
        onScroll={checkForArrows}
      >
        {photoCategories.map(category => (
          <Button
            key={category.id}
            variant={variant === "hero" ? "ghost" : "outline"}
            onClick={() => onCategoryChange(category.id)}
            className={getButtonStyles(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </div>
      
      {/* Right arrow */}
      {showRightArrow && (
        <motion.div 
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => scroll("right")} 
            className={variant === "hero" ? "text-white bg-black/20 hover:bg-black/40 p-1" : ""}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default CategoryCarousel;