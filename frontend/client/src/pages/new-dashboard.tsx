import { useLocation } from "wouter";
import { 
  Activity, 
  Shield, 
  Heart, 
  Pill, 
  FileText,
  MessageCircle,
  ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

export default function NewDashboard() {
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();

  // Check if user has admin or doctor role - redirect them away from user dashboard
  if (authUser?.roles?.includes("admin")) {
    setLocation("/admin");
    return null;
  }
  if (authUser?.roles?.includes("doctor")) {
    setLocation("/doctor-dashboard");
    return null;
  }

  const features = [
    {
      icon: Activity,
      title: "Symptom Checker",
      description: "AI-powered analysis",
      path: "/chat?mode=symptom_checker",
      color: "from-indigo-50 via-indigo-50 to-blue-50 dark:from-indigo-950 dark:via-indigo-900 dark:to-blue-900",
      iconBg: "bg-indigo-100 dark:bg-indigo-800"
    },
    {
      icon: Shield,
      title: "Insurance Help",
      description: "Claims & assistance",
      path: "/chat?mode=simple",
      color: "from-teal-50 via-emerald-50 to-green-50 dark:from-teal-950 dark:via-emerald-900 dark:to-green-900",
      iconBg: "bg-teal-100 dark:bg-teal-800"
    },
    {
      icon: Heart,
      title: "Health Metrics",
      description: "Track your vitals",
      path: "/health-monitoring",
      color: "from-pink-50 via-rose-50 to-red-50 dark:from-pink-950 dark:via-rose-900 dark:to-red-900",
      iconBg: "bg-pink-100 dark:bg-pink-800"
    },
    {
      icon: Pill,
      title: "Medications",
      description: "Reminders & tracking",
      path: "/medicine-reminder",
      color: "from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-900 dark:to-fuchsia-900",
      iconBg: "bg-violet-100 dark:bg-violet-800"
    },
    {
      icon: FileText,
      title: "Medical Reports",
      description: "Upload & analyze",
      path: "/scanner",
      color: "from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-900 dark:to-yellow-900",
      iconBg: "bg-orange-100 dark:bg-orange-800"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {authUser?.name || "there"}
            </h1>
            <span className="text-lg">👋</span>
          </div>
          <p className="text-muted-foreground text-base">Manage your health with AI-powered insights</p>
        </div>

        {/* Primary CTA Card */}
        <Card 
          className="p-6 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground cursor-pointer hover-elevate active-elevate-2 border-0 shadow-lg transition-all duration-300"
          onClick={() => setLocation("/chat")}
          data-testid="card-chat-assistant"
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Healthcare Chat Assistant</h2>
                <p className="text-sm text-primary-foreground/80">AI-powered health guidance available 24/7</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 flex-shrink-0 opacity-70" />
          </div>
        </Card>

        {/* Features Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Healthcare Services</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className={`p-5 cursor-pointer hover-elevate active-elevate-2 border-0 transition-all duration-300 group bg-gradient-to-br ${feature.color}`}
                  onClick={() => setLocation(feature.path)}
                  data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-current opacity-75" />
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm text-foreground">{feature.title}</h3>
                      <p className="text-xs text-foreground/60">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
