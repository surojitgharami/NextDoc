import { useAuth } from "@/context/auth-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUserAvatar() {
  const { user } = useAuth();

  // Fetch profile data to get the potentially updated avatar
  const { data: profileData } = useQuery({
    queryKey: ["/api/profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await apiRequest("GET", `/api/profile/${user.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Use profile avatarUrl first (most up-to-date), fallback to auth avatar_url
  const avatarUrl = profileData?.avatarUrl || user?.avatar_url || null;

  return {
    avatarUrl,
    user,
    profileData,
  };
}
