import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createCategoryId } from "@/lib/categories";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Check, X } from "lucide-react";

type CustomCategory = {
  id: number;
  userId: number;
  categoryId: string;
  label: string;
  description: string | null;
};

export default function CategoryManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch user's custom categories
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories/custom'],
    enabled: !!user,
  });

  // Create a new custom category
  const createCategoryMutation = useMutation({
    mutationFn: (categoryName: string) => {
      const categoryId = createCategoryId(categoryName);
      return apiRequest("/api/categories/custom", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          label: categoryName,
          description: `Custom category: ${categoryName}`
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "Your custom category has been created successfully."
      });
      setNewCategory("");
      queryClient.invalidateQueries({ queryKey: ['/api/categories/custom'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create category",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  // Update an existing custom category
  const updateCategoryMutation = useMutation({
    mutationFn: (category: { id: number, label: string }) => {
      return apiRequest(`/api/categories/custom/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: category.label
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "Your custom category has been updated successfully."
      });
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ['/api/categories/custom'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update category",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  // Delete a custom category
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => {
      return apiRequest(`/api/categories/custom/${categoryId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Your custom category has been deleted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/custom'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete category",
        description: error.message || "Something went wrong.",
        variant: "destructive"
      });
    }
  });

  const handleCreateCategory = () => {
    if (!newCategory.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    
    createCategoryMutation.mutate(newCategory);
  };

  const handleDeleteCategory = (categoryId: number) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  const startEditing = (category: CustomCategory) => {
    setEditingCategory(category);
    setEditValue(category.label);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditValue("");
  };

  const saveEdit = () => {
    if (!editingCategory) return;
    
    if (!editValue.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty.",
        variant: "destructive"
      });
      return;
    }
    
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      label: editValue
    });
  };

  const renderCategoryList = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500">
          <p>You haven't created any custom categories yet.</p>
          <p className="text-sm">Custom categories help you organize your photos in more personalized ways.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {categories.map((category: CustomCategory) => (
          <div key={category.id} className="flex items-center justify-between p-2 border rounded-md">
            {editingCategory && editingCategory.id === category.id ? (
              <div className="flex-1 flex gap-2">
                <Input 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1"
                  placeholder="Category name"
                />
                <Button variant="ghost" size="icon" onClick={saveEdit} disabled={updateCategoryMutation.isPending}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelEditing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {category.categoryId}
                  </Badge>
                  <span className="font-medium">{category.label}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEditing(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} disabled={deleteCategoryMutation.isPending}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            disabled={createCategoryMutation.isPending}
          />
          <Button 
            onClick={handleCreateCategory} 
            disabled={createCategoryMutation.isPending || !newCategory.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
        
        {renderCategoryList()}
      </CardContent>
      <CardFooter className="text-sm text-gray-500">
        <p>
          Custom categories will appear alongside system categories when organizing and viewing photos.
        </p>
      </CardFooter>
    </Card>
  );
}