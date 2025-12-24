import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to send reset link");
      }

      setSubmitted(true);
      toast({
        title: "Email Sent",
        description: "If an account exists with this email, you'll receive a password reset link.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset link";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and spam folder.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              The link will expire in 1 hour.
            </p>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try a different email
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setLocation("/sign-in")}
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100 dark:from-purple-950 dark:via-background dark:to-purple-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(124,58,237,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(124,58,237,0.1),transparent_50%)]" />
      
      <div className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-12 left-0"
          onClick={() => setLocation("/sign-in")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="bg-background/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-border/50">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Forgot Password?</h1>
              <p className="text-muted-foreground text-sm">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setLocation("/sign-in")}
                className="text-sm text-primary hover:underline"
              >
                Remember your password? Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
