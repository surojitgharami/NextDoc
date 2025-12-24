import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Activity, Heart, Stethoscope, Brain } from "lucide-react";

export default function NewWelcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative w-full max-w-sm mx-auto p-8">
            <div className="relative bg-primary/5 rounded-full p-16 border-4 border-primary/20">
              <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-4">
                <Brain className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute top-1/2 left-8 -translate-y-1/2 bg-primary/10 rounded-full p-4">
                <Stethoscope className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute top-1/2 right-8 -translate-y-1/2 bg-primary/10 rounded-full p-4">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-primary/10 rounded-full p-4">
                <Activity className="w-10 h-10 text-primary" />
              </div>
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Powered by AI</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Your Virtual
          </h1>
          <h2 className="text-4xl font-bold text-primary tracking-tight">
            Healthcare Chatbot
          </h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your Virtual Healthcare Assistant: Partner in wellness, just a message away.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button 
            size="lg"
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 group"
            onClick={() => setLocation("/sign-in")}
            data-testid="button-get-started"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
