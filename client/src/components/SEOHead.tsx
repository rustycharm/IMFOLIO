import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  imageUrl?: string;
  imageAlt?: string;
  structuredData?: any;
  canonicalUrl?: string;
}

export function SEOHead({
  title = "IMFOLIO | Professional Photography Portfolio Platform",
  description = "Discover stunning photography portfolios from professional photographers. Create your own beautiful portfolio and showcase your work on IMFOLIO.",
  keywords = ["photography portfolio", "photographer website", "professional photography"],
  imageUrl = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80",
  imageAlt = "IMFOLIO - Professional Photography Portfolio Platform",
  structuredData,
  canonicalUrl
}: SEOHeadProps) {
  const [location] = useLocation();

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    updateMetaTag('description', description);

    // Update meta keywords
    updateMetaTag('keywords', keywords.join(', '));

    // Update Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', imageUrl);
    updateMetaTag('og:url', `https://imfolio.com${location}`);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:site_name', 'IMFOLIO.COM');

    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', imageUrl);
    updateMetaTag('twitter:image:alt', imageAlt);

    // Update canonical URL
    if (canonicalUrl) {
      updateLinkTag('canonical', canonicalUrl);
    }

    // Add structured data
    if (structuredData) {
      updateStructuredData(structuredData);
    }
  }, [title, description, keywords, imageUrl, imageAlt, location, structuredData, canonicalUrl]);

  return null; // This component doesn't render anything visible
}

function updateMetaTag(property: string, content: string) {
  // Handle both name and property attributes
  const selector = property.startsWith('og:') || property.startsWith('twitter:') 
    ? `meta[property="${property}"]` 
    : `meta[name="${property}"]`;
  
  let metaTag = document.querySelector(selector) as HTMLMetaElement;
  
  if (metaTag) {
    metaTag.content = content;
  } else {
    metaTag = document.createElement('meta');
    if (property.startsWith('og:') || property.startsWith('twitter:')) {
      metaTag.setAttribute('property', property);
    } else {
      metaTag.setAttribute('name', property);
    }
    metaTag.content = content;
    document.head.appendChild(metaTag);
  }
}

function updateLinkTag(rel: string, href: string) {
  let linkTag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (linkTag) {
    linkTag.href = href;
  } else {
    linkTag = document.createElement('link');
    linkTag.rel = rel;
    linkTag.href = href;
    document.head.appendChild(linkTag);
  }
}

function updateStructuredData(data: any) {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Hook for dynamic SEO data loading
export function useDynamicSEO(userId?: string) {
  const [location] = useLocation();

  useEffect(() => {
    if (userId && location.includes('/portfolio/')) {
      // Fetch SEO data for portfolio page
      fetch(`/api/seo/portfolio/${userId}`)
        .then(res => res.json())
        .then(seoData => {
          document.title = seoData.title;
          updateMetaTag('description', seoData.description);
          updateMetaTag('keywords', seoData.keywords.join(', '));
          
          if (seoData.structuredData) {
            updateStructuredData(seoData.structuredData);
          }
        })
        .catch(error => {
          console.log('SEO data fetch failed, using defaults:', error);
        });
    }
  }, [userId, location]);
}