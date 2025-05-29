import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const refreshUser = () => {
    refetch();
  };

  const refreshAuth = () => {
    refetch();
  };

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "GET",
        credentials: "include",
      });
      // Clear the user data from cache
      queryClient.setQueryData(["/api/auth/user"], null);
      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refreshUser,
    refreshAuth,
    logout,
  };
}