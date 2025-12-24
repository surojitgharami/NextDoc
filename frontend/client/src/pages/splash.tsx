import { useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/context/auth-context";
import { MessageCircle } from "lucide-react";

function SplashContent() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/welcome");
    }, 2500);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            NextDoc
          </h1>
          <p className="text-primary-foreground/90 text-sm">AI Healthcare Assistant</p>
        </div>
      </div>
    </div>
  );
}

export default function Splash() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse" />
            <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              NextDoc
            </h1>
            <p className="text-primary-foreground/90 text-sm">AI Healthcare Assistant</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Redirect to="/" />;
  }

  return <SplashContent />;
}
