import { useLocation } from "wouter";
import { Home, MessageCircle, Clock, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavProps {
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export default function BottomNav({ sidebarOpen = false, onSidebarToggle }: BottomNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: Clock, label: "History", path: "/history" },
    { icon: User, label: "Profile", path: "/profile" }
  ];

  // Hide bottom nav on main pages - only show on mobile
  const hideOnPages = ["/dashboard", "/chat", "/history", "/profile", "/profile-details", "/settings"];
  const shouldHide = hideOnPages.includes(location);

  if (shouldHide) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {/* Hamburger Menu Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onSidebarToggle}
          className="flex-col h-auto py-2 gap-1 text-muted-foreground"
          data-testid="button-hamburger-menu-mobile"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-xs font-medium">Menu</span>
        </Button>

        {/* Navigation Items */}
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`flex-col h-auto py-2 gap-1 flex-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => setLocation(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
