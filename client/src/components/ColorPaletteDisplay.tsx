import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Sparkles, Eye } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ColorPalette {
  colors: Array<{
    hex: string;
    rgb: { r: number; g: number; b: number };
    percentage: number;
    luminance: number;
  }>;
  dominantColor: string;
  mood: 'warm' | 'cool' | 'neutral';
  brightness: 'dark' | 'medium' | 'bright';
}

interface ColorPaletteDisplayProps {
  heroImage: {
    id: string;
    name: string;
    url?: string;
    imageUrl?: string;
    dominantColor?: string;
    colorPalette?: ColorPalette;
    colorAnalysisComplete?: boolean;
  };
  onExtractColors: (heroImageId: string) => Promise<void>;
  isExtracting: boolean;
}

export function ColorPaletteDisplay({ heroImage, onExtractColors, isExtracting }: ColorPaletteDisplayProps) {
  const [showFullPalette, setShowFullPalette] = useState(false);
  
  const hasPalette = heroImage.colorPalette && heroImage.colorAnalysisComplete;
  const palette = heroImage.colorPalette;

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'warm': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cool': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBrightnessColor = (brightness: string) => {
    switch (brightness) {
      case 'dark': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'bright': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero Image Preview */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-12 rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={heroImage.url || heroImage.imageUrl || '/images/placeholder.jpg'}
            alt={heroImage.name || 'Hero image'}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{heroImage.name}</h3>
          <p className="text-sm text-gray-500">{heroImage.id}</p>
        </div>
      </div>

      {/* Extract Colors Button */}
      {!hasPalette && (
        <Button
          onClick={() => onExtractColors(heroImage.id)}
          disabled={isExtracting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {isExtracting ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Extracting Colors...
            </>
          ) : (
            <>
              <Palette className="w-4 h-4 mr-2" />
              Extract Color Palette
            </>
          )}
        </Button>
      )}

      {/* Color Palette Display */}
      {hasPalette && palette && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Dominant Color */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: palette.dominantColor }}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Dominant Color</p>
              <p className="text-xs text-gray-500 uppercase">{palette.dominantColor}</p>
            </div>
          </div>

          {/* Mood and Brightness Tags */}
          <div className="flex gap-2">
            <Badge variant="outline" className={getMoodColor(palette.mood)}>
              <Sparkles className="w-3 h-3 mr-1" />
              {palette.mood}
            </Badge>
            <Badge variant="outline" className={getBrightnessColor(palette.brightness)}>
              <Eye className="w-3 h-3 mr-1" />
              {palette.brightness}
            </Badge>
          </div>

          {/* Color Swatches */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullPalette(!showFullPalette)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {showFullPalette ? 'Hide' : 'Show'} Full Palette ({palette.colors.length} colors)
            </Button>

            <AnimatePresence>
              {showFullPalette && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {palette.colors.map((color, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-gray-900 uppercase">{color.hex}</p>
                        <p className="text-xs text-gray-500">{color.percentage}%</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Re-extract Option */}
          <Button
            onClick={() => onExtractColors(heroImage.id)}
            disabled={isExtracting}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <Palette className="w-3 h-3 mr-2" />
                Re-extract Colors
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}