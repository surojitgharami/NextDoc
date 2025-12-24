import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, Eye, EyeOff, Check, X, Bell, Palette } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useTheme } from "@/context/theme-context";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface NotificationSettings {
  emailNotifications: boolean;
  newsAndUpdates: boolean;
  tipsAndTutorials: boolean;
  userResearch: boolean;
  emailComments: boolean;
  emailReminders: boolean;
  pushNotifications: boolean;
  pushComments: boolean;
  pushReminders: boolean;
  moreActivityAboutYou: boolean;
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { data: notificationSettings } = useQuery<NotificationSettings>({
    queryKey: ["/api/notification-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await apiRequest('GET', `/api/notification-settings?userId=${user.id}`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordChangeFormData) => {
      if (!user) throw new Error("User not authenticated");
      
      const response = await apiRequest('PUT', '/api/auth/change-password', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      if (!user?.id) throw new Error("User not authenticated");
      return await apiRequest("PUT", `/api/notification-settings?userId=${user.id}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings", user?.id] });
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    },
  });

  const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
    if (!notificationSettings) return;
    
    let updated = { ...notificationSettings, [key]: value };
    
    if (key === 'emailNotifications' && !value) {
      updated = {
        ...updated,
        newsAndUpdates: false,
        tipsAndTutorials: false,
        userResearch: false,
        emailComments: false,
        emailReminders: false,
      };
    }
    
    if (key === 'pushNotifications' && !value) {
      updated = {
        ...updated,
        pushComments: false,
        pushReminders: false,
        moreActivityAboutYou: false,
      };
    }
    
    notificationMutation.mutate(updated);
  };

  const onPasswordSubmit = (data: PasswordChangeFormData) => {
    passwordMutation.mutate(data);
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 2, label: "Weak Password", color: "bg-red-500" };
    if (strength === 3) return { strength: 3, label: "Medium Password", color: "bg-orange-500" };
    return { strength: 4, label: "Strong Password", color: "bg-green-500" };
  };

  const newPassword = form.watch("newPassword");
  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50 dark:from-background dark:via-background dark:to-blue-950">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl opacity-20 dark:opacity-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl opacity-20 dark:opacity-10" />
      </div>

      <div className="max-w-4xl mx-auto p-6 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 group">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            data-testid="button-back"
            className="rounded-xl transition-all duration-200 hover-elevate"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Settings</h1>
            <p className="text-sm text-muted-foreground">Customize your CareBot experience</p>
          </div>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="w-full space-y-3" defaultValue="appearance">
          {/* Appearance Section */}
          <AccordionItem value="appearance" data-testid="accordion-appearance" className="border-0 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-blue-200/30 dark:border-blue-800/30 shadow-sm transition-all duration-300 hover:shadow-md">
            <AccordionTrigger className="hover:no-underline px-6 py-5 text-base font-semibold" data-testid="trigger-appearance">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Appearance</div>
                  <p className="text-xs text-muted-foreground font-normal">
                    Customize how CareBot looks on your device
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 border-t border-blue-200/30 dark:border-blue-800/30">
              <div className="pt-2">
                <Card className="border-0 bg-gradient-to-br from-white/50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-950/30 backdrop-blur-lg shadow-sm hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>
                      Choose your preferred theme. Light mode for daytime, dark mode for night.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">Light Mode</h4>
                          <p className="text-sm text-muted-foreground">
                            Bright and clean interface for daytime use
                          </p>
                        </div>
                        <Button
                          size="lg"
                          variant={theme === "light" ? "default" : "outline"}
                          onClick={() => setTheme("light")}
                          className="min-w-32"
                          data-testid="button-theme-light"
                        >
                          Light
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">Dark Mode</h4>
                          <p className="text-sm text-muted-foreground">
                            Easy on the eyes during night time use
                          </p>
                        </div>
                        <Button
                          size="lg"
                          variant={theme === "dark" ? "default" : "outline"}
                          onClick={() => setTheme("dark")}
                          className="min-w-32"
                          data-testid="button-theme-dark"
                        >
                          Dark
                        </Button>
                      </div>

                      <div className="pt-4 border-t mt-6">
                        <p className="text-sm text-muted-foreground">
                          Current theme: <span className="font-medium text-foreground">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Security Section */}
          <AccordionItem value="security" data-testid="accordion-security">
            <AccordionTrigger className="hover:no-underline" data-testid="trigger-security">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Security</div>
                  <p className="text-sm text-muted-foreground font-normal">
                    Manage your password and 2-step verification preferences
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4 space-y-6">                
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password for enhanced account security.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                    disabled={passwordMutation.isPending}
                                    data-testid="input-current-password"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-0 top-0"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    disabled={passwordMutation.isPending}
                                    data-testid="button-toggle-current-password"
                                  >
                                    {showCurrentPassword ? (
                                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...field}
                                    disabled={passwordMutation.isPending}
                                    data-testid="input-new-password"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-0 top-0"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    disabled={passwordMutation.isPending}
                                    data-testid="button-toggle-new-password"
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              
                              {newPassword && (
                                <div className="space-y-2 mt-2">
                                  <div className="flex gap-1">
                                    {[...Array(4)].map((_, i) => (
                                      <div
                                        key={i}
                                        className={`h-1 flex-1 rounded-full ${
                                          i < passwordStrength!.strength ? passwordStrength!.color : "bg-muted"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className={`text-sm font-medium ${
                                    passwordStrength!.strength <= 2 ? "text-red-500" : 
                                    passwordStrength!.strength === 3 ? "text-orange-500" : "text-green-500"
                                  }`}>
                                    {passwordStrength!.label}
                                  </p>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                      {hasMinLength ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <X className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <span className={hasMinLength ? "text-foreground" : "text-muted-foreground"}>
                                        At least 8 characters
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {hasNumber ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <X className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <span className={hasNumber ? "text-foreground" : "text-muted-foreground"}>
                                        At least 1 number
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {hasUppercase ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                      ) : (
                                        <X className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <span className={hasUppercase ? "text-foreground" : "text-muted-foreground"}>
                                        At least 1 uppercase
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••"
                                    {...field}
                                    disabled={passwordMutation.isPending}
                                    data-testid="input-confirm-password"
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-0 top-0"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={passwordMutation.isPending}
                                    data-testid="button-toggle-confirm-password"
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <Eye className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => form.reset()}
                            disabled={passwordMutation.isPending}
                            data-testid="button-cancel-password"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={passwordMutation.isPending}
                            data-testid="button-apply-password"
                          >
                            {passwordMutation.isPending ? "Updating..." : "Apply Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Notifications Section */}
          <AccordionItem value="notifications" data-testid="accordion-notifications">
            <AccordionTrigger className="hover:no-underline" data-testid="trigger-notifications">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">Notifications</div>
                  <p className="text-sm text-muted-foreground font-normal">
                    Manage when you'll be notified on which channels
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification settings</CardTitle>
                    <CardDescription>
                      Select the kinds of notifications you get about your activities and recommendations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">Email notifications</h3>
                          <p className="text-sm text-muted-foreground">
                            Get emails to find out what's going on when you're not online. You can turn these off.
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings?.emailNotifications ?? false}
                          onCheckedChange={(checked) => handleNotificationToggle("emailNotifications", checked)}
                          data-testid="switch-email-notifications"
                        />
                      </div>

                      {notificationSettings?.emailNotifications && (
                        <div className="pl-4 space-y-4 border-l-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">News and updates</h4>
                              <p className="text-sm text-muted-foreground">News about product and feature updates.</p>
                            </div>
                            <Switch
                              checked={notificationSettings?.newsAndUpdates ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("newsAndUpdates", checked)}
                              data-testid="switch-news-updates"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Tips and tutorials</h4>
                              <p className="text-sm text-muted-foreground">Tips on getting more out of CareBot.</p>
                            </div>
                            <Switch
                              checked={notificationSettings?.tipsAndTutorials ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("tipsAndTutorials", checked)}
                              disabled={!notificationSettings?.emailNotifications}
                              data-testid="switch-tips-tutorials"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">User research</h4>
                              <p className="text-sm text-muted-foreground">
                                Get involved in our beta testing program or participate in paid product user research.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.userResearch ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("userResearch", checked)}
                              disabled={!notificationSettings?.emailNotifications}
                              data-testid="switch-user-research"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Comments</h4>
                              <p className="text-sm text-muted-foreground">
                                These are notifications for comments on your posts and replies to your comments.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.emailComments ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("emailComments", checked)}
                              disabled={!notificationSettings?.emailNotifications}
                              data-testid="switch-email-comments"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Reminders</h4>
                              <p className="text-sm text-muted-foreground">
                                These are notifications to remind you of updates you might have missed.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.emailReminders ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("emailReminders", checked)}
                              disabled={!notificationSettings?.emailNotifications}
                              data-testid="switch-email-reminders"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">Push notifications</h3>
                          <p className="text-sm text-muted-foreground">
                            Get push notifications to find out what's going on when you're not active on the app.
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings?.pushNotifications ?? false}
                          onCheckedChange={(checked) => handleNotificationToggle("pushNotifications", checked)}
                          data-testid="switch-push-notifications"
                        />
                      </div>

                      {notificationSettings?.pushNotifications && (
                        <div className="pl-4 space-y-4 border-l-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Comments</h4>
                              <p className="text-sm text-muted-foreground">
                                These are notifications for comments on your posts and replies to your comments.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.pushComments ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("pushComments", checked)}
                              disabled={!notificationSettings?.pushNotifications}
                              data-testid="switch-push-comments"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">Reminders</h4>
                              <p className="text-sm text-muted-foreground">
                                These are notifications to remind you of updates you might have missed.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.pushReminders ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("pushReminders", checked)}
                              disabled={!notificationSettings?.pushNotifications}
                              data-testid="switch-push-reminders"
                            />
                          </div>

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-medium">More activity about you</h4>
                              <p className="text-sm text-muted-foreground">
                                These are notifications about activity on your account.
                              </p>
                            </div>
                            <Switch
                              checked={notificationSettings?.moreActivityAboutYou ?? false}
                              onCheckedChange={(checked) => handleNotificationToggle("moreActivityAboutYou", checked)}
                              disabled={!notificationSettings?.pushNotifications}
                              data-testid="switch-more-activity"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
