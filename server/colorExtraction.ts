import OpenAI from "openai";

export interface ColorPalette {
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

export class ColorExtractor {
  private static openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  
  private static get isAIAvailable() {
    return !!process.env.OPENAI_API_KEY;
  }

  // Extract dominant colors from an image URL using AI vision
  static async extractColors(imageUrl: string): Promise<ColorPalette> {
    if (!this.isAIAvailable) {
      console.log('AI color extraction unavailable, using fallback analysis');
      return this.getFallbackPalette(imageUrl);
    }
    
    try {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a color palette extraction expert. Analyze the image and extract the dominant colors with their hex codes, RGB values, percentages, and overall mood. Respond with JSON in this exact format: { \"colors\": [{ \"hex\": \"#rrggbb\", \"rgb\": { \"r\": 0, \"g\": 0, \"b\": 0 }, \"percentage\": 0, \"luminance\": 0.0 }], \"dominantColor\": \"#rrggbb\", \"mood\": \"warm|cool|neutral\", \"brightness\": \"dark|medium|bright\" }"
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the dominant color palette from this hero banner image. Provide 3-6 most prominent colors with their hex codes, RGB values, approximate percentages, and luminance values (0-1 scale). Also determine the overall mood (warm/cool/neutral) and brightness level."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 800
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Validate and clean the response
      if (result.colors && Array.isArray(result.colors)) {
        return {
          colors: result.colors.map((color: any) => ({
            hex: color.hex || '#000000',
            rgb: color.rgb || { r: 0, g: 0, b: 0 },
            percentage: Math.min(100, Math.max(0, color.percentage || 0)),
            luminance: Math.min(1, Math.max(0, color.luminance || 0))
          })),
          dominantColor: result.dominantColor || result.colors[0]?.hex || '#000000',
          mood: this.validateMood(result.mood),
          brightness: this.validateBrightness(result.brightness)
        };
      } else {
        throw new Error('Invalid color analysis response');
      }
    } catch (error) {
      console.error('Error extracting colors with AI:', error);
      // Return fallback analysis based on image URL patterns
      return this.getFallbackPalette(imageUrl);
    }
  }

  // Validate mood response from AI
  private static validateMood(mood: string): 'warm' | 'cool' | 'neutral' {
    return ['warm', 'cool', 'neutral'].includes(mood) ? mood as 'warm' | 'cool' | 'neutral' : 'neutral';
  }

  // Validate brightness response from AI
  private static validateBrightness(brightness: string): 'dark' | 'medium' | 'bright' {
    return ['dark', 'medium', 'bright'].includes(brightness) ? brightness as 'dark' | 'medium' | 'bright' : 'medium';
  }

  // Fallback palette based on image naming patterns
  private static getFallbackPalette(imageUrl: string): ColorPalette {
    const url = imageUrl.toLowerCase();
    
    if (url.includes('forest') || url.includes('green')) {
      return {
        colors: [
          { hex: '#2d5016', rgb: { r: 45, g: 80, b: 22 }, percentage: 40, luminance: 0.3 },
          { hex: '#8fbc8f', rgb: { r: 143, g: 188, b: 143 }, percentage: 35, luminance: 0.6 },
          { hex: '#654321', rgb: { r: 101, g: 67, b: 33 }, percentage: 25, luminance: 0.25 }
        ],
        dominantColor: '#2d5016',
        mood: 'cool',
        brightness: 'medium'
      };
    }
    
    if (url.includes('sunset') || url.includes('mountain')) {
      return {
        colors: [
          { hex: '#ff7f50', rgb: { r: 255, g: 127, b: 80 }, percentage: 35, luminance: 0.7 },
          { hex: '#4682b4', rgb: { r: 70, g: 130, b: 180 }, percentage: 30, luminance: 0.5 },
          { hex: '#2f4f4f', rgb: { r: 47, g: 79, b: 79 }, percentage: 35, luminance: 0.3 }
        ],
        dominantColor: '#ff7f50',
        mood: 'warm',
        brightness: 'medium'
      };
    }
    
    if (url.includes('ocean') || url.includes('beach')) {
      return {
        colors: [
          { hex: '#006994', rgb: { r: 0, g: 105, b: 148 }, percentage: 45, luminance: 0.4 },
          { hex: '#87ceeb', rgb: { r: 135, g: 206, b: 235 }, percentage: 30, luminance: 0.7 },
          { hex: '#f0f8ff', rgb: { r: 240, g: 248, b: 255 }, percentage: 25, luminance: 0.9 }
        ],
        dominantColor: '#006994',
        mood: 'cool',
        brightness: 'bright'
      };
    }
    
    // Default neutral palette
    return {
      colors: [
        { hex: '#6b7280', rgb: { r: 107, g: 114, b: 128 }, percentage: 50, luminance: 0.4 },
        { hex: '#374151', rgb: { r: 55, g: 65, b: 81 }, percentage: 30, luminance: 0.2 },
        { hex: '#9ca3af', rgb: { r: 156, g: 163, b: 175 }, percentage: 20, luminance: 0.6 }
      ],
      dominantColor: '#6b7280',
      mood: 'neutral',
      brightness: 'medium'
    };
  }
}