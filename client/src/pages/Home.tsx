import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import About from "@/components/About";
import SyncIntegration from "@/components/SyncIntegration";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { Photo } from "@shared/schema";

type PhotoResponse = Photo & {
  photographer?: string;
  photographerUsername?: string;
};

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Home = () => {
  // Authentication state
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Get the current location to check for URL parameters
  const [location, setLocation] = useLocation();


  
  // Parse the URL to extract any featured category
  const getInitialCategory = () => {
    const url = new URL(window.location.href);
    const featuredParam = url.searchParams.get('featured');
    return featuredParam || "all";
  };
  
  const [selectedCategory, setSelectedCategory] = useState<string>(getInitialCategory());
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [currentPhoto, setCurrentPhoto] = useState<PhotoResponse | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [visiblePhotos, setVisiblePhotos] = useState<PhotoResponse[]>([]);
  
  // Remove authentication dependency for home page display

  // Update URL when category changes for shareable links
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    
    // Update URL with the selected category without page reload
    const url = new URL(window.location.href);
    if (category === "all") {
      url.searchParams.delete('featured');
    } else {
      url.searchParams.set('featured', category);
    }
    window.history.pushState({}, '', url.toString());
  };

  const openLightbox = (photo: PhotoResponse, index: number, photos: PhotoResponse[]) => {
    setCurrentPhoto(photo);
    setPhotoIndex(index);
    setVisiblePhotos(photos);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    if (visiblePhotos.length === 0) return;
    const newIndex = (photoIndex + 1) % visiblePhotos.length;
    setPhotoIndex(newIndex);
    setCurrentPhoto(visiblePhotos[newIndex]);
  };

  const prevImage = () => {
    if (visiblePhotos.length === 0) return;
    const newIndex = (photoIndex - 1 + visiblePhotos.length) % visiblePhotos.length;
    setPhotoIndex(newIndex);
    setCurrentPhoto(visiblePhotos[newIndex]);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Hero selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
      <Gallery 
        selectedCategory={selectedCategory} 
        onPhotoClick={openLightbox} 
        setVisiblePhotos={setVisiblePhotos}
      />
      <PhotoLightbox
        isOpen={lightboxOpen}
        photos={visiblePhotos}
        currentIndex={photoIndex}
        onClose={closeLightbox}
        onNavigate={(direction) => {
          if (direction === 'next') nextImage();
          else prevImage();
        }}
      />
      <About isLoggedIn={isAuthenticated} />
      <SyncIntegration />
      <Contact />
      <Footer />
    </div>
  );
};

export default Home;
