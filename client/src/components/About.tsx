import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Linkedin, Camera, Globe, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AboutProps {
  isLoggedIn?: boolean;
}

const About = ({ isLoggedIn = false }: AboutProps) => {
  const iconVariants = {
    hover: { scale: 1.2, color: "hsl(var(--primary))" }
  };
  
  // Use global auth context instead of individual query
  const { user, isAuthenticated } = useAuth();
  
  // We'll respect the isLoggedIn prop passed from parent, but use our authenticated state as backup
  const showUserProfile = isLoggedIn || isAuthenticated;

  return (
    <section id="about" className="py-24 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {showUserProfile && user ? (
            // Show photographer profile for logged-in users
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <motion.div 
                className="md:w-1/3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="rounded-full w-64 h-64 border-4 border-white shadow-xl mx-auto overflow-hidden bg-gray-200 flex items-center justify-center">
                  {(user as any)?.profileImageUrl ? (
                    <img
                      src={(user as any).profileImageUrl}
                      alt={`${(user as any).firstName || 'Photographer'} - Profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl font-bold text-gray-400">
                      {(user as any)?.firstName?.[0] || (user as any)?.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </motion.div>
              <motion.div 
                className="md:w-2/3"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="playfair text-3xl font-bold mb-6">About Me</h2>
                {(user as any).bio ? (
                  <div className="text-gray-700 mb-6 whitespace-pre-line">
                    {(user as any).bio}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 mb-4">
                      {`I'm ${user.firstName || 'a professional'} ${user.lastName || 'photographer'}, capturing the world through my lens. My work focuses on finding beauty in both natural landscapes and human expression.`}
                    </p>
                    <p className="text-gray-700 mb-4">
                      What started as a hobby during my travels has evolved into a lifelong passion. I believe photography has the unique ability to freeze moments in time, allowing us to experience emotion and beauty indefinitely.
                    </p>
                    <p className="text-gray-700 mb-6">
                      My work has been featured in various art galleries and publications. I'm available for commissions and collaborations.
                    </p>
                  </>
                )}
                <div className="flex space-x-6">
                  <motion.a 
                    href="#" 
                    className="text-gray-600 hover:text-primary transition-colors"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Instagram className="h-6 w-6" />
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="text-gray-600 hover:text-primary transition-colors"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Twitter className="h-6 w-6" />
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="text-gray-600 hover:text-primary transition-colors"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Facebook className="h-6 w-6" />
                  </motion.a>
                  <motion.a 
                    href="#" 
                    className="text-gray-600 hover:text-primary transition-colors"
                    whileHover="hover"
                    variants={iconVariants}
                  >
                    <Linkedin className="h-6 w-6" />
                  </motion.a>
                </div>
              </motion.div>
            </div>
          ) : (
            // Show IMFOLIO platform information for non-logged-in users
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <motion.div 
                className="md:w-1/3"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="bg-white p-8 rounded-xl shadow-xl text-center">
                  <div className="mx-auto bg-primary/10 w-32 h-32 rounded-full flex items-center justify-center mb-4">
                    <Camera className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl mb-2">IMFOLIO</h3>
                  <p className="text-gray-600">Your photography showcase platform</p>
                </div>
              </motion.div>
              <motion.div 
                className="md:w-2/3"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="playfair text-3xl font-bold mb-6">About IMFOLIO</h2>
                <p className="text-gray-700 mb-4">
                  IMFOLIO is a modern photography portfolio platform designed for photographers who want to showcase their work with elegance and simplicity.
                </p>
                <p className="text-gray-700 mb-4">
                  Our platform seamlessly integrates with Apple Photos and Google Photos, allowing you to curate and display your best work without the hassle of manual uploads.
                </p>
                <p className="text-gray-700 mb-6">
                  Create your free IMFOLIO account today to start building your professional photography portfolio.
                </p>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">Showcase your work globally</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">Automatic photo syncing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-gray-700">Connect with other photographers</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default About;
