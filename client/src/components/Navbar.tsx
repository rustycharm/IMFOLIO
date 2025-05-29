import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X } from "lucide-react";
import { generatePortfolioUrl } from "@/lib/utils";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // Enhanced scroll detection for mobile performance
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 10);
    };

    // Throttle scroll events for better mobile performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-sm shadow-sm' 
          : 'bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link 
              href="/" 
              className="text-xl font-light text-black uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              IMFOLIO.COM
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <>
                  <Link href={generatePortfolioUrl(user)} className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    Portfolio
                  </Link>
                  <Link href="/my-photos" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    Upload Photos
                  </Link>
                  <Link href="/account" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    Account
                  </Link>
                  {(user as any)?.role === 'admin' && (
                    <Link href="/admin/dashboard" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                      Admin Dashboard
                    </Link>
                  )}
                  <div className="flex items-center space-x-4">
                    <Link href="/account" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border">
                        {(user as any)?.profileImageUrl ? (
                          <img 
                            src={(user as any).profileImageUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('Navbar profile image failed to load:', (user as any)?.profileImageUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="text-xs font-medium text-gray-600">
                            {(user as any)?.firstName?.[0] || (user as any)?.username?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    </Link>
                    <button 
                      onClick={() => window.location.href = '/api/logout'}
                      className="px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <a href="#gallery" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    Gallery
                  </a>
                  <a href="#about" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    About
                  </a>
                  <a href="#contact" className="text-black hover:text-gray-600 font-light uppercase tracking-wider text-sm transition-colors">
                    Contact
                  </a>
                  <a 
                    href="/api/login" 
                    className="px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase"
                  >
                    Sign In
                  </a>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-3 text-black hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-md"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                type="button"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-100 bg-opacity-80 md:hidden">
          <div className="flex flex-col">
            {/* Mobile Header - Full Opacity */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <h1 className="text-xl font-light text-black uppercase tracking-wider">IMFOLIO.COM</h1>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-black hover:text-gray-600"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Mobile Menu Items - Top Aligned with Full Width Borders */}
            <div className="px-6 py-5">
              {/* Mobile User Profile Section */}
              {isAuthenticated && (
                <div className="flex items-center space-x-3 mb-6 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border">
                    {(user as any)?.profileImageUrl ? (
                      <img 
                        src={(user as any).profileImageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-600">
                        {(user as any)?.firstName?.[0] || (user as any)?.username?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(user as any)?.firstName && (user as any)?.lastName
                        ? `${(user as any).firstName} ${(user as any).lastName}`
                        : (user as any)?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {(user as any)?.emailPartial || 'Signed in'}
                    </p>
                  </div>
                </div>
              )}
              
              <nav className="space-y-3.5 w-full">
                {isAuthenticated ? (
                  <>
                    <Link 
                      href={generatePortfolioUrl(user)} 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Portfolio
                    </Link>
                    <Link 
                      href="/my-photos" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Upload Photos
                    </Link>
                    <Link 
                      href="/account" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Account
                    </Link>
                    {(user as any)?.role === 'admin' && (
                      <Link 
                        href="/admin/dashboard" 
                        className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button 
                      onClick={() => {
                        setIsMenuOpen(false);
                        window.location.href = '/api/logout';
                      }}
                      className="block w-full text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <a 
                      href="#gallery" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Gallery
                    </a>
                    <a 
                      href="#about" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      About
                    </a>
                    <a 
                      href="#contact" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Contact
                    </a>
                    <a 
                      href="/api/login" 
                      className="block text-center text-lg text-black hover:text-gray-600 font-light uppercase tracking-wide py-3.5 px-4 border border-gray-400 hover:bg-gray-200 hover:border-gray-500 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </a>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;