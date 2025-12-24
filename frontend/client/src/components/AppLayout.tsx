import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Bell } from "lucide-react";
import { useUser } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NotificationPanel from "@/components/NotificationPanel";
import BottomNav from "./BottomNav";
import { useUserAvatar } from "@/hooks/use-user-avatar";
import { useQuery } from "@tanstack/react-query";
import { getNavItemsForUser } from "@/utils/navItems";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { user } = useUser();
  const { avatarUrl } = useUserAvatar();

  // Get navigation items filtered by user roles
  const navItems = user?.roles ? getNavItemsForUser(user.roles) : [];

  const isChatPage = location === "/chat";

  const handleNavClick = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: user?.id ? [`/api/notifications/unread-count`] : ['unread-count-disabled'],
    enabled: !!user?.id,
    retry: false,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const getInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <div className="flex flex-col h-full" id="app-layout" style={{ maxHeight: '100vh', overflow: 'hidden' }}>
      {!isChatPage && (
        <div className="border-b bg-gradient-to-r from-background to-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-xl hover:bg-primary/10 transition-colors duration-200"
            data-testid="button-hamburger-menu"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex-1 text-center">NextDoc</h1>

          <div className="flex items-center gap-2 ml-4">
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-primary/10 transition-colors duration-200" data-testid="button-notifications">
                  <Bell className="w-5 h-5" />
                  {unreadData && unreadData.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center font-semibold animate-pulse">
                      {unreadData.count > 9 ? '9+' : unreadData.count}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <NotificationPanel onClose={() => setNotificationOpen(false)} />
              </PopoverContent>
            </Popover>

            <Avatar 
              className="w-10 h-10 border-2 border-primary/20 cursor-pointer hover-elevate ring-2 ring-primary/10 transition-all duration-200" 
              onClick={() => handleNavClick("/profile")}
            >
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {!isChatPage && (
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
              data-testid="sidebar-overlay"
            />
          )}

          <div
            className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-background via-background to-background/95 border-r border-border/50 z-40 flex flex-col pt-20 transition-transform duration-300 ease-in-out shadow-xl ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <nav className="flex flex-col gap-1 p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
                        : 'text-foreground hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`sidebar-nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white/30 rounded-l-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto p-4 border-t border-border/50 bg-muted/30">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">NextDoc</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">Healthcare Assistant</p>
                  <p className="text-xs text-muted-foreground">AI-powered care</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className={isChatPage ? "flex-1 overflow-hidden" : "flex-1 overflow-auto"} style={{ minHeight: 0 }}>
        {children}
      </main>

      <BottomNav sidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
    </div>
  );
}
