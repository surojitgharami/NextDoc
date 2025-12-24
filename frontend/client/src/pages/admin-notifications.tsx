import { useState } from "react";
import { Bell, Send, Mail, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useAdminSendNotification, useAdminNotificationHistory } from "@/lib/api-hooks";
import { formatDistanceToNow } from "date-fns";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaPush, setSendViaPush] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const sendMutation = useAdminSendNotification();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useAdminNotificationHistory();

  if (!user?.roles?.includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-muted-foreground mt-2">You do not have admin privileges</p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both title and message",
        variant: "destructive",
      });
      return;
    }

    const via: ("email" | "push")[] = [];
    if (sendViaEmail) via.push("email");
    if (sendViaPush) via.push("push");

    if (via.length === 0) {
      toast({
        title: "Select Delivery Method",
        description: "Please select at least one delivery method",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await sendMutation.mutateAsync({
        title,
        body,
        via,
      });

      toast({
        title: "Notification Sent",
        description: "Your announcement has been sent to all users",
      });

      setTitle("");
      setBody("");
      refetchHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const notifications = historyData?.notifications || [];
  const sentCount = notifications.filter((n: any) => n.status === 'sent').length;
  const pendingCount = notifications.filter((n: any) => n.status === 'pending').length;
  const failedCount = notifications.filter((n: any) => n.status === 'failed').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Messaging & Notifications</h1>
            <p className="text-muted-foreground">Broadcast announcements and send notifications to users</p>
          </div>
          <Button variant="outline" onClick={() => refetchHistory()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{sentCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{failedCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="compose">Compose Announcement</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  rows={5}
                />
              </div>

              <div className="space-y-3">
                <Label>Delivery Method</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email"
                      checked={sendViaEmail}
                      onCheckedChange={(checked) => setSendViaEmail(checked as boolean)}
                    />
                    <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                      <Mail className="w-4 h-4" />
                      Send via Email
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="push"
                      checked={sendViaPush}
                      onCheckedChange={(checked) => setSendViaPush(checked as boolean)}
                    />
                    <Label htmlFor="push" className="flex items-center gap-2 cursor-pointer">
                      <Bell className="w-4 h-4" />
                      In-App Notification (Push)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSend} disabled={isSending} className="gap-2">
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send to All Users
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <Card className="p-6 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications sent yet</p>
              </Card>
            ) : (
              notifications.map((notif: any) => (
                <Card key={notif.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-lg">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.body}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      notif.status === 'sent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      notif.status === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {notif.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {notif.via?.includes('email') && <Mail className="w-3 h-3" />}
                      {notif.via?.includes('push') && <Bell className="w-3 h-3" />}
                      {notif.via?.join(', ')}
                    </span>
                    <span>{notif.recipient_count || 0} recipients</span>
                    <span>
                      {notif.created_at && formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
