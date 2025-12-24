import { useAuth, useUser } from "@/context/auth-context";
import { 
  User as UserIcon, 
  ChevronRight, 
  CreditCard, 
  MessageSquare, 
  Lock, 
  Shield, 
  FileText, 
  HelpCircle, 
  History,
  ArrowLeft,
  BarChart3,
  Users,
  Bell
} from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useUserAvatar } from "@/hooks/use-user-avatar";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}

function MenuItem({ icon, label, onClick, testId }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 bg-card rounded-lg border hover-elevate active-elevate-2"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const { avatarUrl } = useUserAvatar();
  const { user } = useUser();
  const { logout, hasRole } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = hasRole('admin');

  const handleMenuClick = (item: string) => {
    toast({
      title: "Coming Soon",
      description: `${item} feature will be available soon.`
    });
  };

  const handleSignOut = async () => {
    await logout();
    setLocation("/welcome");
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back-to-dashboard"
              className="md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">My Profile</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{user?.name || 'User Name'}</h2>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'email@example.com'}
              </p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">Admin Menu</h3>
            
            <MenuItem
              icon={<BarChart3 className="w-5 h-5" />}
              label="System Reports"
              onClick={() => setLocation("/dashboard/admin/reports")}
              testId="menu-reports"
            />
            
            <MenuItem
              icon={<Users className="w-5 h-5" />}
              label="User Management"
              onClick={() => setLocation("/dashboard/admin/users")}
              testId="menu-user-management"
            />
            
            <MenuItem
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              onClick={() => setLocation("/dashboard/admin/notifications")}
              testId="menu-admin-notifications"
            />
            
            <MenuItem
              icon={<Lock className="w-5 h-5" />}
              label="Settings"
              onClick={() => setLocation("/dashboard/admin/settings")}
              testId="menu-admin-settings"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">Account Settings</h3>
            
            <MenuItem
              icon={<UserIcon className="w-5 h-5" />}
              label="Personal Information"
              onClick={() => setLocation("/profile-details")}
              testId="menu-personal-info"
            />
            
            <MenuItem
              icon={<History className="w-5 h-5" />}
              label="Booking History"
              onClick={() => setLocation("/history")}
              testId="menu-booking-history"
            />
            
            <MenuItem
              icon={<CreditCard className="w-5 h-5" />}
              label="My Cards"
              onClick={() => handleMenuClick("My Cards")}
              testId="menu-cards"
            />
            
            <MenuItem
              icon={<MessageSquare className="w-5 h-5" />}
              label="Message"
              onClick={() => setLocation("/chat")}
              testId="menu-message"
            />
            
            <MenuItem
              icon={<Lock className="w-5 h-5" />}
              label="Settings"
              onClick={() => setLocation("/settings")}
              testId="menu-settings"
            />
          </div>
        )}

        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Policy Center</h3>
          
          <MenuItem
            icon={<Shield className="w-5 h-5" />}
            label="Privacy Policy"
            onClick={() => setLocation("/privacy-policy")}
            testId="menu-privacy"
          />
          
          <MenuItem
            icon={<FileText className="w-5 h-5" />}
            label="Terms & Conditions"
            onClick={() => setLocation("/terms-conditions")}
            testId="menu-terms"
          />
        </div>

        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Support</h3>
          
          <MenuItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Help Center"
            onClick={() => setLocation("/help-center")}
            testId="menu-help"
          />
        </div>

        <div className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
            data-testid="button-sign-out"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
