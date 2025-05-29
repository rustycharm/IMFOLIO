import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. AI features will be disabled.');
}

export interface HeroBannerAnalysis {
  visualStyle: string;
  mood: string;
  colorPalette: string[];
  photographyType: string;
  timeOfDay: string;
  season: string;
  appealRating: number;
  targetAudience: string[];
}

export interface BannerRecommendation {
  recommendedBannerId: string;
  reason: string;
  confidence: number;
  userType: string;
  timeContext?: string;
}

export interface AIRecommendationResult {
  analysis: HeroBannerAnalysis[];
  recommendations: BannerRecommendation[];
  insights: string[];
  suggestedRotation?: {
    schedule: string;
    bannerOrder: string[];
    reasoning: string;
  };
}

export class AIRecommendationService {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  private readonly model = "gpt-4o";

  async analyzeHeroBanners(heroImages: any[]): Promise<AIRecommendationResult> {
    // Return placeholder data when API key is missing
    if (!process.env.OPENAI_API_KEY) {
      return {
        analysis: [],
        recommendations: [],
        insights: ['AI analysis unavailable - API key not configured'],
      };
    }
    
    try {
      const bannerDescriptions = heroImages.map(img => ({
        id: img.id,
        name: img.name || img.title,
        description: img.description,
        url: img.url || img.image_url,
        isDefault: img.is_default
      }));

      const analysisPrompt = `
As an expert in visual design and photography, analyze these hero banner images for a professional photography portfolio platform called IMFOLIO.

Hero Banners:
${bannerDescriptions.map(banner => 
  `- ID: ${banner.id}
   Name: ${banner.name}
   Description: ${banner.description}
   Currently Default: ${banner.isDefault ? 'Yes' : 'No'}`
).join('\n')}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "analysis": [
    {
      "bannerId": "banner-id",
      "visualStyle": "description of visual style",
      "mood": "emotional tone/mood",
      "colorPalette": ["primary", "secondary", "accent colors"],
      "photographyType": "landscape/nature/abstract/etc",
      "timeOfDay": "morning/afternoon/sunset/night",
      "season": "spring/summer/autumn/winter",
      "appealRating": 1-10,
      "targetAudience": ["landscape photographers", "nature lovers", etc]
    }
  ],
  "recommendations": [
    {
      "recommendedBannerId": "banner-id",
      "reason": "why this banner works best",
      "confidence": 0.8,
      "userType": "target user type",
      "timeContext": "when to use this banner"
    }
  ],
  "insights": [
    "Key insight about the banner collection",
    "Recommendation for improvements"
  ],
  "suggestedRotation": {
    "schedule": "rotation frequency",
    "bannerOrder": ["banner-id-1", "banner-id-2"],
    "reasoning": "why this rotation works"
  }
}

Focus on:
1. Visual impact and professional appeal
2. Emotional connection with photographers
3. Seasonal and time-based recommendations
4. User type matching (landscape, portrait, wedding photographers, etc.)
5. Optimal rotation strategies for maximum engagement
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an expert visual design analyst specializing in photography portfolio platforms. Provide detailed, actionable insights in valid JSON format."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');
      return aiResult as AIRecommendationResult;

    } catch (error) {
      console.error("Error analyzing hero banners with AI:", error);
      throw new Error("Failed to generate AI recommendations");
    }
  }

  async recommendBannerForUser(userProfile: any, heroImages: any[]): Promise<BannerRecommendation> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        recommendedBannerId: heroImages[0]?.id || 'default',
        reason: 'Default recommendation - AI analysis unavailable',
        confidence: 0.5,
        userType: 'general',
        timeContext: 'always'
      };
    }
    
    try {
      const userContext = `
User Profile:
- Photography Style: ${userProfile.photographyStyle || 'General'}
- Location: ${userProfile.location || 'Unknown'}
- Experience Level: ${userProfile.experienceLevel || 'Unknown'}
- Preferred Subjects: ${userProfile.preferredSubjects || 'Various'}
`;

      const bannersContext = heroImages.map(img => 
        `${img.id}: ${img.name} - ${img.description}`
      ).join('\n');

      const recommendationPrompt = `
Based on this user profile and available hero banners, recommend the most suitable banner.

${userContext}

Available Banners:
${bannersContext}

Respond with JSON:
{
  "recommendedBannerId": "banner-id",
  "reason": "detailed explanation why this banner matches the user",
  "confidence": 0.85,
  "userType": "user classification",
  "timeContext": "when this recommendation applies"
}
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a personalization expert for photography platforms. Match users with the most appealing hero banners based on their profile and preferences."
          },
          {
            role: "user",
            content: recommendationPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });

      const recommendation = JSON.parse(response.choices[0].message.content || '{}');
      return recommendation as BannerRecommendation;

    } catch (error) {
      console.error("Error generating personalized banner recommendation:", error);
      throw new Error("Failed to generate personalized recommendation");
    }
  }

  async suggestNewBannerThemes(existingBanners: any[]): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
      return [
        'Golden hour landscape with dramatic mountain silhouettes',
        'Urban photography with modern architectural elements',
        'Minimalist black and white portrait composition',
        'Vibrant nature macro photography with shallow depth of field',
        'Moody seascape with long exposure effects'
      ];
    }
    
    try {
      const existingThemes = existingBanners.map(banner => 
        `${banner.name}: ${banner.description}`
      ).join('\n');

      const suggestionPrompt = `
Current Hero Banners:
${existingThemes}

Based on these existing banners and current photography trends, suggest 5 new hero banner themes that would complement the collection and appeal to different photographer types.

Respond with JSON:
{
  "suggestions": [
    "Detailed theme description with visual elements",
    "Another complementary theme idea"
  ]
}

Focus on:
- Filling gaps in the current collection
- Current photography and design trends
- Different seasons and moods
- Various photography niches
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a creative director specializing in photography and visual design trends. Suggest innovative, appealing banner themes."
          },
          {
            role: "user",
            content: suggestionPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '{}');
      return suggestions.suggestions || [];

    } catch (error) {
      console.error("Error generating banner theme suggestions:", error);
      throw new Error("Failed to generate theme suggestions");
    }
  }
}

export const aiRecommendationService = new AIRecommendationService();