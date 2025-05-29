import { Link } from "wouter";
import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

const Footer = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Get display name for the footer
  const displayName = useMemo(() => {
    if (!isAuthenticated || !user) return 'IMFOLIO.COM';
    
    return user.firstName ? 
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username.toUpperCase() : 
      'IMFOLIO.COM';
  }, [user, isAuthenticated]);

  return (
    <footer className="bg-white py-8 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-xl font-light uppercase tracking-wide">
              {displayName}
            </Link>
            <p className="text-gray-500 text-sm mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-600 hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
