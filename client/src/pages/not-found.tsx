import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen w-full bg-white">
      {/* Header with IMFOLIO branding */}
      <nav className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-center">
          <Link href="/" className="text-xl font-light text-black uppercase tracking-wider hover:text-gray-600 transition-colors">
            IMFOLIO.COM
          </Link>
        </div>
      </nav>
      
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* Large 404 with minimal styling */}
          <div className="mb-12">
            <h1 className="text-8xl md:text-9xl font-light text-black leading-none tracking-wider">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="mb-12 space-y-6">
            <h2 className="text-2xl md:text-3xl font-light text-black uppercase tracking-wider">
              Portfolio Not Found
            </h2>
            <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed font-light">
              We couldn't find a photographer with the requested portfolio.
            </p>
            {location && (
              <p className="text-sm text-gray-500 font-mono bg-gray-50 px-4 py-2 rounded inline-block border">
                {location}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/">
              <button className="px-8 py-3 border border-black text-black hover:bg-black hover:text-white transition-colors text-sm uppercase tracking-wider font-light">
                Return Home
              </button>
            </Link>
            
            <button 
              onClick={() => window.history.back()}
              className="px-8 py-3 text-black hover:text-gray-600 transition-colors text-sm uppercase tracking-wider font-light"
            >
              Go Back
            </button>
          </div>

          {/* Help Text */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 font-light uppercase tracking-wide">
              Looking for a specific photographer? Browse featured portfolios
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 font-light">
            © {new Date().getFullYear()} IMFOLIO.COM - All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}