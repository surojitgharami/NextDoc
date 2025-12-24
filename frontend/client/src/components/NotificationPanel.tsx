import { useState } from "react";
import { useUser } from "@/context/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  getNotifications, 
  markRead, 
  markAllRead, 
  deleteNotification,
  type Notification 
} from "@/lib/notifications-api";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Video, 
  Image as ImageIcon, 
  Lock, 
  Gift, 
  MessageSquare,
  Bell,
  Trash2,
  CheckCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type TabType = "today" | "this-week" | "earlier";

interface NotificationPanelProps {
  onClose?: () => void;
}

export default function NotificationPanel({ onClose: _onClose }: NotificationPanelProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("today");

  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: getNotifications,
    enabled: !!user?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (notification.isRead === 'false') {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const getIconForType = (type: string, iconType: string | null | undefined) => {
    if (type === 'admin_notification') {
      return <Bell className="w-5 h-5 text-blue-500" />;
    }
    
    switch (iconType) {
      case 'video':
        return <Video className="w-5 h-5 text-primary" />;
      case 'gif':
      case 'image':
        return <ImageIcon className="w-5 h-5 text-primary" />;
      case 'lock':
        return <Lock className="w-5 h-5 text-green-500" />;
      case 'gift':
        return <Gift className="w-5 h-5 text-purple-500" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'pill':
        return <Gift className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const filterNotificationsByTab = (notifications: Notification[]): Notification[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return notifications.filter((notification) => {
      const notificationDate = new Date(notification.createdAt);
      
      if (activeTab === "today") {
        return notificationDate >= today;
      } else if (activeTab === "this-week") {
        return notificationDate >= weekAgo && notificationDate < today;
      } else {
        return notificationDate < weekAgo;
      }
    });
  };

  const filteredNotifications = filterNotificationsByTab(notifications);
  const unreadCount = notifications.filter(n => n.isRead === 'false').length;

  const todayCount = notifications.filter((n) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(n.createdAt) >= today;
  }).length;

  return (
    <Card className="w-[400px] max-w-full overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-foreground">
          Notifications
        </h2>
        {unreadCount > 0 && (
          <span className="bg-white/20 text-primary-foreground px-2 py-0.5 rounded-full text-sm">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
        <Button
          variant={activeTab === "today" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("today")}
          data-testid="tab-today"
          className="rounded-full"
        >
          Today {todayCount > 0 && `(${todayCount})`}
        </Button>
        <Button
          variant={activeTab === "this-week" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("this-week")}
          data-testid="tab-this-week"
          className="rounded-full"
        >
          This Week
        </Button>
        <Button
          variant={activeTab === "earlier" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("earlier")}
          data-testid="tab-earlier"
          className="rounded-full"
        >
          Earlier
        </Button>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        <div className="p-4 space-y-2">
          {error ? (
            <div className="text-center text-destructive py-8">
              <p className="font-medium">Failed to load notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg cursor-pointer relative group",
                  "transition-all duration-200 hover:shadow-md",
                  notification.isRead === 'false' 
                    ? "bg-primary/5 border-l-2 border-primary" 
                    : "bg-background hover:bg-muted/50"
                )}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-${notification.id}`}
              >
                {/* Avatar or Icon */}
                <div className="flex-shrink-0">
                  {notification.avatarUrl ? (
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={notification.avatarUrl} />
                      <AvatarFallback>{notification.title[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center",
                      notification.type === 'admin_notification' 
                        ? "bg-blue-100 dark:bg-blue-900/30" 
                        : "bg-muted"
                    )}>
                      {getIconForType(notification.type, notification.iconType)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{notification.title}</span>
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    {notification.type === 'admin_notification' && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-medium mr-1">
                        Admin
                      </span>
                    )}
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Unread Indicator */}
                  {notification.isRead === 'false' && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-1" />
                  )}
                  
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                    disabled={deleteNotificationMutation.isPending}
                    data-testid={`button-delete-${notification.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <div className="border-t p-3 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="w-4 h-4" />
            {markAllAsReadMutation.isPending ? "Marking..." : `Mark all ${unreadCount} as read`}
          </Button>
        </div>
      )}
    </Card>
  );
}
