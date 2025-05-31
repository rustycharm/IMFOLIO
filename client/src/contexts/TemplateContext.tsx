import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PortfolioTemplate } from "@shared/schema";

interface TemplateContextType {
  currentTemplate: PortfolioTemplate | null;
  isLoading: boolean;
  error: string | null;
}

const TemplateContext = createContext<TemplateContextType>({
  currentTemplate: null,
  isLoading: true,
  error: null
});

export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }
  return context;
};

interface TemplateProviderProps {
  children: React.ReactNode;
  userId?: string; // For public portfolios
}

export const TemplateProvider = ({ children, userId }: TemplateProviderProps) => {
  const [currentTemplate, setCurrentTemplate] = useState<PortfolioTemplate | null>(null);

  // Fetch all available templates
  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json() as Promise<PortfolioTemplate[]>;
    },
  });

  // Fetch user's template selection (only if not viewing public portfolio)
  const { data: userTemplate, isLoading, error } = useQuery({
    queryKey: userId ? ["/api/user/template", userId] : ["/api/user/template"],
    queryFn: async () => {
      const url = userId ? `/api/portfolio/${userId}/template` : "/api/user/template";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch user template");
      return response.json() as Promise<{ templateId: string }>;
    },
    enabled: true
  });

  // Set current template based on user selection or default
  useEffect(() => {
    if (templates && userTemplate) {
      const selectedTemplate = templates.find(t => t.id === userTemplate.templateId);
      if (selectedTemplate) {
        setCurrentTemplate(selectedTemplate);
        applyTemplateStyles(selectedTemplate);
      } else {
        // Fallback to default template
        const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
        if (defaultTemplate) {
          setCurrentTemplate(defaultTemplate);
          applyTemplateStyles(defaultTemplate);
        }
      }
    }
  }, [templates, userTemplate]);

  const applyTemplateStyles = (template: PortfolioTemplate) => {
    const root = document.documentElement;
    const colorScheme = template.colorScheme as any;
    const typography = template.typography as any;
    const layout = template.layout as any;

    // Apply color scheme
    if (colorScheme) {
      root.style.setProperty('--template-primary', colorScheme.primary || '#000000');
      root.style.setProperty('--template-secondary', colorScheme.secondary || '#ffffff');
      root.style.setProperty('--template-accent', colorScheme.accent || '#f5f5f5');
      root.style.setProperty('--template-text', colorScheme.text || '#333333');
      root.style.setProperty('--template-text-light', colorScheme.textLight || '#666666');
      root.style.setProperty('--template-background', colorScheme.background || '#ffffff');
      root.style.setProperty('--template-card-background', colorScheme.cardBackground || '#ffffff');
      root.style.setProperty('--template-border', colorScheme.border || '#e5e5e5');
    }

    // Apply typography
    if (typography) {
      root.style.setProperty('--template-font-family', typography.fontFamily || 'Montserrat');
      root.style.setProperty('--template-heading-weight', typography.headingWeight || '300');
      root.style.setProperty('--template-body-weight', typography.bodyWeight || '400');
      root.style.setProperty('--template-heading-size', typography.headingSize || '2xl');
      root.style.setProperty('--template-body-size', typography.bodySize || 'base');
    }

    // Apply layout settings
    if (layout) {
      root.style.setProperty('--template-gallery-gap', layout.galleryGap || '4');
      root.style.setProperty('--template-hero-height', layout.heroHeight || '60vh');
      root.style.setProperty('--template-container-padding', layout.containerPadding || '4');
    }

    // Add template-specific class to body
    document.body.className = document.body.className.replace(/template-\w+/g, '');
    document.body.classList.add(`template-${template.id}`);
  };

  return (
    <TemplateContext.Provider 
      value={{ 
        currentTemplate, 
        isLoading, 
        error: error?.message || null 
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
};