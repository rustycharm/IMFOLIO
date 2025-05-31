import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Palette, Eye, Sparkles } from "lucide-react";
import type { PortfolioTemplate } from "@shared/schema";

interface PortfolioCustomizationProps {
  className?: string;
}

const PortfolioCustomization = ({ className = "" }: PortfolioCustomizationProps) => {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Fetch all available templates
  const { 
    data: templates, 
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

  // Fetch user's current template selection
  const { 
    data: userTemplate, 
    isLoading: isLoadingUserTemplate,
    error: userTemplateError 
  } = useQuery({
    queryKey: ["/api/user/template"],
    queryFn: async () => {
      const response = await fetch("/api/user/template");
      if (!response.ok) {
        throw new Error("Failed to fetch user template");
      }
      return response.json() as Promise<{ templateId: string }>;
    },
  });

  // Mutation to update template selection
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return await apiRequest("/api/user/template", {
        method: "POST",
        body: JSON.stringify({ templateId }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/template"] });
      toast({
        title: "Template Updated",
        description: "Your portfolio template has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    updateTemplateMutation.mutate(templateId);
  };

  const currentTemplateId = selectedTemplate || userTemplate?.templateId || 'classic';

  const renderTemplatePreview = (template: PortfolioTemplate) => {
    const colorScheme = template.colorScheme as any;
    const typography = template.typography as any;
    
    return (
      <div 
        className="relative h-32 rounded-lg overflow-hidden border-2 transition-all duration-200"
        style={{ 
          backgroundColor: colorScheme?.background || '#ffffff',
          borderColor: template.id === currentTemplateId ? '#2563eb' : '#e5e7eb'
        }}
      >
        {/* Template preview content */}
        <div className="absolute inset-0 p-3">
          <div 
            className="text-xs font-light mb-1"
            style={{ 
              color: colorScheme?.text || '#000000',
              fontWeight: typography?.headingWeight || '300'
            }}
          >
            {template.name}
          </div>
          <div className="grid grid-cols-3 gap-1 h-16">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded"
                style={{ 
                  backgroundColor: colorScheme?.accent || '#f5f5f5',
                  opacity: 0.7
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Selected indicator */}
        {template.id === currentTemplateId && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTemplates || isLoadingUserTemplate) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div>
          <h3 className="text-xl font-semibold mb-2">Portfolio Templates</h3>
          <p className="text-gray-500">Choose a design template for your portfolio</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full rounded-lg mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (templatesError || userTemplateError) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <p className="text-red-600">Unable to load templates. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-xl font-semibold mb-2">Portfolio Templates</h3>
        <p className="text-gray-500">Choose a design template that best showcases your photography style</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates?.map((template) => {
          const isSelected = template.id === currentTemplateId;
          const colorScheme = template.colorScheme as any;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">{template.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {template.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    {template.category && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600">{template.description}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {renderTemplatePreview(template)}
                
                {/* Color palette preview */}
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gray-500" />
                  <div className="flex gap-1">
                    {[
                      colorScheme?.primary,
                      colorScheme?.secondary,
                      colorScheme?.accent,
                      colorScheme?.background
                    ].filter(Boolean).map((color: string, index: number) => (
                      <div
                        key={index}
                        className="w-4 h-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full"
                  disabled={updateTemplateMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template.id);
                  }}
                >
                  {updateTemplateMutation.isPending && selectedTemplate === template.id ? (
                    "Applying..."
                  ) : isSelected ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Currently Active
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Apply Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates && templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No templates available at the moment.</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioCustomization;