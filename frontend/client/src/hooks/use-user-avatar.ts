import { useAuth } from "@/context/auth-context";

export function useUserAvatar() {
  const { user } = useAuth();

  const avatarUrl = user?.avatar_url || null;

  return {
    avatarUrl,
    user,
    profileData: null,
  };
}
