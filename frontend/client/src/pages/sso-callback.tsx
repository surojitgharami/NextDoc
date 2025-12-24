import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";

export default function SSOCallback() {
  const clerk = useClerk();
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Handle the OAuth callback
        await clerk.handleRedirectCallback({
          redirectUrl: "/dashboard"
        });
        setLocation("/dashboard");
      } catch (error) {
        console.error("SSO callback error:", error);
        setLocation("/sign-in");
      }
    }

    handleCallback();
  }, [clerk, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-lg text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
