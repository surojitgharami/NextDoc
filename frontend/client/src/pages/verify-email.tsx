import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { user, accessToken } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "resend">("loading");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("resend");
    }
  }, [search]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Verification failed");
      }

      setStatus("success");
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully!",
      });
    } catch (error: unknown) {
      console.error("Verification error:", error);
      setStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Verification failed";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleResend = async () => {
    if (!accessToken) {
      toast({
        title: "Not Signed In",
        description: "Please sign in to resend verification email.",
        variant: "destructive",
      });
      setLocation("/sign-in");
      return;
    }

    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to resend verification email");
      }

      toast({
        title: "Email Sent",
        description: "Verification email has been sent. Please check your inbox.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to resend";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Verifying Email...</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Email Verified!</h1>
            <p className="text-muted-foreground mb-6">
              Your email address has been verified successfully. You now have full access to all features.
            </p>
            <Button className="w-full" onClick={() => setLocation("/user-dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Verification Failed</h1>
            <p className="text-muted-foreground mb-6">
              This verification link is invalid or has expired. Please request a new verification email.
            </p>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "Sending..." : "Resend Verification Email"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setLocation("/sign-in")}>
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Mail className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
          <p className="text-muted-foreground mb-6">
            {user ? (
              <>
                We sent a verification email to <strong>{user.email}</strong>. 
                Click the link in the email to verify your account.
              </>
            ) : (
              "Please check your email for a verification link to complete your registration."
            )}
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={handleResend}
              disabled={resending || !accessToken}
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setLocation("/user-dashboard")}>
              Continue to Dashboard
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Some features may be limited until you verify your email.
          </p>
        </div>
      </div>
    </div>
  );
}
