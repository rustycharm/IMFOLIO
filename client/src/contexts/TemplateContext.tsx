import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { PortfolioTemplate } from "@shared/schema";

interface TemplateContextType {
  currentTemplate: PortfolioTemplate | null;
  isLoading: boolean;
  error: Error | null;
}

const TemplateContext = createContext<TemplateContextType>({
  currentTemplate: null,
  isLoading: true,
  error: null,
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
}

export const TemplateProvider = ({ children }: TemplateProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const [currentTemplate, setCurrentTemplate] = useState<PortfolioTemplate | null>({
    id: 'classic',
    name: 'Classic',
    description: 'Traditional portfolio layout',
    preview: '/images/templates/classic-preview.jpg'
  });

  // Fetch user's template selection
  const { 
    data: userTemplateSelection, 
    isLoading: isLoadingSelection,
    error: selectionError 
  } = useQuery({
    queryKey: ["/api/user/template"],
    queryFn: async () => {
      const response = await fetch("/api/user/template");
      if (!response.ok) {
        throw new Error("Failed to fetch user template");
      }
      return response.json() as Promise<{ templateId: string }>;
    },
    enabled: isAuthenticated && !!user,
  });

  // Fetch all templates
  const { 
    data: allTemplates, 
    isLoading: isLoadingTemplates,
    error: templatesError 
  } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return response.json() as Promise<PortfolioTemplate[]>;
    },
  });

  // Update current template when data changes
  useEffect(() => {
    if (allTemplates && userTemplateSelection) {
      const template = allTemplates.find(t => t.id === userTemplateSelection.templateId);
      if (template) {
        setCurrentTemplate(template);
        applyTemplateStyles(template);
      }
    } else if (allTemplates && !userTemplateSelection && !isAuthenticated) {
      // For non-authenticated users, use the default template
      const defaultTemplate = allTemplates.find(t => t.isDefault) || allTemplates[0];
      if (defaultTemplate) {
        setCurrentTemplate(defaultTemplate);
        applyTemplateStyles(defaultTemplate);
      }
    }
  }, [allTemplates, userTemplateSelection, isAuthenticated]);

  const applyTemplateStyles = (template: PortfolioTemplate) => {
    const root = document.documentElement;
    const colorScheme = template.colorScheme as any;
    const typography = template.typography as any;

    // Apply CSS custom properties for the template
    if (colorScheme) {
      root.style.setProperty('--template-primary', colorScheme.primary || '#000000');
      root.style.setProperty('--template-secondary', colorScheme.secondary || '#ffffff');
      root.style.setProperty('--template-accent', colorScheme.accent || '#f5f5f5');
      root.style.setProperty('--template-text', colorScheme.text || '#333333');
      root.style.setProperty('--template-text-light', colorScheme.textLight || '#666666');
      root.style.setProperty('--template-background', colorScheme.background || '#ffffff');
      root.style.setProperty('--template-card-bg', colorScheme.cardBackground || '#ffffff');
      root.style.setProperty('--template-border', colorScheme.border || '#e5e5e5');
    }

    if (typography) {
      root.style.setProperty('--template-font-family', typography.fontFamily || 'Montserrat');
      root.style.setProperty('--template-heading-weight', typography.headingWeight || '300');
      root.style.setProperty('--template-body-weight', typography.bodyWeight || '400');
    }

    // Add template-specific class to body
    document.body.className = document.body.className.replace(/template-\w+/g, '');
    document.body.classList.add(`template-${template.id}`);
  };

  const isLoading = isLoadingSelection || isLoadingTemplates;
  const error = selectionError || templatesError;

  return (
    <TemplateContext.Provider value={{ 
      currentTemplate, 
      isLoading, 
      error: error as Error | null 
    }}>
      {children}
    </TemplateContext.Provider>
  );
};