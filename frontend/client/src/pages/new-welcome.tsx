import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Activity, Heart, Stethoscope, Brain, Pill, Scan } from "lucide-react";
import { PolicyModal } from "@/components/policy-modal";

export default function NewWelcome() {
  const [, setLocation] = useLocation();
  const [modalType, setModalType] = useState<"terms" | "privacy_policy" | null>(null);

  const features = [
    { Icon: Brain, label: "AI Diagnosis", color: "from-pink-500 to-rose-500", position: "top-[10%] left-[8%]" },
    { Icon: Heart, label: "Health Monitor", color: "from-red-500 to-pink-500", position: "top-[15%] right-[12%]" },
    { Icon: Activity, label: "Vital Tracking", color: "from-cyan-500 to-blue-500", position: "bottom-[25%] left-[10%]" },
    { Icon: Stethoscope, label: "Consultations", color: "from-indigo-500 to-purple-500", position: "top-[45%] right-[8%]" },
    { Icon: Pill, label: "Medications", color: "from-violet-500 to-purple-500", position: "bottom-[15%] right-[15%]" },
    { Icon: Scan, label: "Scan Reports", color: "from-blue-500 to-indigo-500", position: "top-[60%] left-[5%]" },
  ];

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-900 transition-colors duration-700">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-200/40 via-transparent to-transparent dark:from-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-200/40 via-transparent to-transparent dark:from-purple-900/20" />
        
        {/* Floating Orbs */}
        <div className="orb orb-1 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 dark:from-blue-600/20 dark:to-cyan-600/20" />
        <div className="orb orb-2 bg-gradient-to-br from-purple-400/30 to-pink-400/30 dark:from-purple-600/20 dark:to-pink-600/20" />
        <div className="orb orb-3 bg-gradient-to-br from-indigo-400/30 to-blue-400/30 dark:from-indigo-600/20 dark:to-blue-600/20" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.03]" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          
          {/* Left Side - Orbital Design */}
          <div className="relative h-[400px] lg:h-[500px] hidden lg:flex items-center justify-center">
            {/* Orbital Rings - centered */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border-2 border-blue-500/20 dark:border-blue-400/20 orbital-ring-outer"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-purple-500/15 dark:border-purple-400/15 orbital-ring-middle"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full border border-pink-500/10 dark:border-pink-400/10 orbital-ring-inner"></div>
            
            {/* Central Element - centered */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-400/30 dark:via-purple-400/30 dark:to-pink-400/30 backdrop-blur-xl border border-white/20 dark:border-white/10 flex items-center justify-center shadow-2xl central-pulse">
                <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400 central-icon-spin" />
              </div>
              {/* Glow layers */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-2xl animate-pulse-slow -z-10"></div>
            </div>
            
            {/* Orbiting Icons - centered container */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px]">
              {features.map((feature, index) => {
                const angle = (index * 360) / features.length;
                const radius = 190; // half of 380px
                const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
                const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;
                
                return (
                  <div
                    key={index}
                    className="orbital-icon-wrapper absolute"
                    style={{
                      top: `calc(50% + ${y}px)`,
                      left: `calc(50% + ${x}px)`,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${index * 0.15}s`
                    }}
                  >
                    <div className="group cursor-pointer orbital-float" style={{ animationDelay: `${index * 0.3}s` }}>
                      {/* Icon with glass effect */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} backdrop-blur-md flex items-center justify-center border border-white/30 dark:border-white/20 shadow-xl transition-all duration-500 hover:scale-125`}>
                        <feature.Icon className="w-7 h-7 text-white" />
                        {/* Subtle glow */}
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} blur-lg opacity-50 group-hover:opacity-80 transition-opacity -z-10`}></div>
                      </div>
                      
                      {/* Floating label */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          {feature.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Ambient background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse-slow -z-10" />
          </div>

          {/* Right Side - Main Content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in-up">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card animate-float">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold tracking-tight">
                <span className="text-slate-900 dark:text-white">Welcome to</span>
                <br />
                <span className="text-gradient-animated bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent inline-block">
                  NextDoc
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Your intelligent healthcare companion. Expert medical guidance, symptom analysis, and wellness support—available 24/7.
              </p>
            </div>

            {/* Features List */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {["AI Diagnosis", "Health Tracking", "24/7 Support"].map((item, i) => (
                <div key={i} className="glass-card px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  ✓ {item}
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="space-y-4 pt-4">
              <Button
                size="lg"
                onClick={() => setLocation("/sign-in")}
                className="group relative h-12 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-400 dark:hover:to-purple-400 text-white font-semibold text-base shadow-xl shadow-blue-500/25 dark:shadow-blue-900/50 hover:shadow-2xl hover:shadow-purple-500/30 dark:hover:shadow-purple-900/50 transition-all duration-300 border-0 overflow-hidden"
                data-testid="button-get-started"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <span className="relative flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              {/* Footer Links */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                By continuing, you agree to our{" "}
                <button
                  onClick={() => setModalType("terms")}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                >
                  Terms
                </button>
                {" & "}
                <button
                  onClick={() => setModalType("privacy_policy")}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
      <PolicyModal
        isOpen={!!modalType}
        type={modalType || "terms"}
        onClose={() => setModalType(null)}
      />

      {/* Styles */}
      <style>{`
        /* Orbital Design Animations */
        
        /* Orbital rings rotation */
        .orbital-ring-outer {
          animation: rotate-ring 40s linear infinite;
        }
        
        .orbital-ring-middle {
          animation: rotate-ring 30s linear infinite reverse;
        }
        
        .orbital-ring-inner {
          animation: rotate-ring 20s linear infinite;
        }
        
        @keyframes rotate-ring {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        /* Central element animations */
        .central-pulse {
          animation: central-pulse 3s ease-in-out infinite;
        }
        
        @keyframes central-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
          }
        }
        
        .central-icon-spin {
          animation: gentle-spin 8s linear infinite;
        }
        
        @keyframes gentle-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Orbital icon fade in animation */
        .orbital-icon-wrapper {
          animation: orbital-fade-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        
        @keyframes orbital-fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        /* Orbital float animation */
        .orbital-float {
          animation: orbital-float-anim 3s ease-in-out infinite;
        }
        
        @keyframes orbital-float-anim {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        /* Fade In Up */
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Float Animation */
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-10px);
          }
        }

        /* Pulse Slow */
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        /* Grid Pattern */
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        /* Gradient Animation */
        .text-gradient-animated {
          background-size: 200% auto;
          animation: gradient-shift 3s ease infinite;
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% center;
          }
          50% {
            background-position: 100% center;
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .orb,
          .feature-card,
          .animate-fade-in-up,
          .animate-float,
          .animate-pulse-slow,
          .text-gradient-animated {
            animation: none !important;
          }
          .feature-card {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
