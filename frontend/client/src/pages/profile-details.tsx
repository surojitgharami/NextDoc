import { useState, useEffect } from "react";
import { useUser, useAuth } from "@/context/auth-context";
import { ArrowLeft, Camera, Droplet, Activity, Edit2 } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserProfile {
  userId: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  weightKg?: string;
  heightCm?: string;
  bloodGroup?: string;
}

const profileFormSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  weightKg: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: "Weight must be a positive number" }
  ),
  heightCm: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: "Height must be a positive number" }
  ),
  bloodGroup: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfileDetails() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { updateUserAvatar } = useAuth();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMetric, setEditingMetric] = useState<'bloodGroup' | 'weight' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const userId = user?.id || 'demo-user';

  // Fetch profile data
  const { data: profileData } = useQuery<UserProfile | null>({
    queryKey: ['/api/profile', userId],
    queryFn: async () => {
      try {
        const token = localStorage.getItem('healthchat_access_token');
        const response = await fetch(`/api/profile/${userId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) return null;
        return response.json();
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        return null;
      }
    },
    enabled: !!userId
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.name || '',
      dateOfBirth: '',
      gender: undefined,
      phone: '',
      email: user?.email || '',
      weightKg: '',
      heightCm: '',
      bloodGroup: '',
    },
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        fullName: profileData.fullName || user?.name || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: (profileData.gender === 'male' || profileData.gender === 'female') ? profileData.gender : undefined,
        phone: profileData.phone || '',
        email: profileData.email || user?.email || '',
        weightKg: profileData.weightKg ? String(profileData.weightKg) : '',
        heightCm: profileData.heightCm ? String(profileData.heightCm) : '',
        bloodGroup: profileData.bloodGroup || '',
      });
    } else if (user && !profileData) {
      form.reset({
        fullName: user.name || '',
        email: user.email || '',
        dateOfBirth: '',
        gender: undefined,
        phone: '',
        weightKg: '',
        heightCm: '',
        bloodGroup: '',
      });
    }
  }, [profileData, user, form]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('healthchat_access_token');
      const response = await fetch(`/api/profile/${userId}/photo`, {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      return response.json();
    },
    onSuccess: (data: { url: string; fileName: string; size: number }) => {
      // Update the profile with the new avatar URL
      setAvatarPreview(null); // Clear local preview
      setSelectedFile(null);
      queryClient.setQueryData(['/api/profile', userId], (old: UserProfile | null) => {
        if (!old) return { avatarUrl: data.url, userId } as UserProfile;
        return { ...old, avatarUrl: data.url };
      });
      updateUserAvatar(data.url);
      queryClient.refetchQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await apiRequest('PUT', `/api/profile/${userId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile', userId] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Upload photo first if selected
      if (selectedFile) {
        await uploadPhotoMutation.mutateAsync(selectedFile);
      }
      
      // Convert empty strings to null for numeric fields
      const profileData = {
        ...data,
        weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
        heightCm: data.heightCm ? parseFloat(data.heightCm) : null,
      };
      
      // Then update profile
      await updateProfileMutation.mutateAsync(profileData as ProfileFormData);
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const currentAvatar = avatarPreview || profileData?.avatarUrl || user?.avatar_url;
  
  const getInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  const handleMetricEdit = (metric: 'bloodGroup' | 'weight') => {
    setEditingMetric(metric);
    if (metric === 'bloodGroup') {
      setEditValue(form.getValues('bloodGroup') || '');
    } else {
      setEditValue(form.getValues('weightKg') || '');
    }
  };

  const handleMetricSave = () => {
    if (editingMetric === 'bloodGroup') {
      form.setValue('bloodGroup', editValue);
    } else if (editingMetric === 'weight') {
      form.setValue('weightKg', editValue);
    }
    setEditingMetric(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-gradient-to-r from-background to-background/95 backdrop-blur-sm border-b px-4 py-3 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="rounded-xl hover:bg-primary/10 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Personal Information</h1>
          </div>
        </header>

        <div className="px-4 py-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary/20 ring-4 ring-primary/10 shadow-lg">
                <AvatarImage src={currentAvatar} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full w-10 h-10 bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                data-testid="button-change-photo"
              >
                <Camera className="w-5 h-5" />
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                data-testid="input-avatar"
              />
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Health Monitoring Section */}
            <Card className="p-6 border-0 shadow-sm bg-gradient-to-br from-card to-card/50 space-y-4">
              <h3 className="font-semibold text-lg">Health Monitoring</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Blood Group Card */}
                <div 
                  className="bg-gradient-to-br from-pink-50 via-pink-50 to-red-50 dark:from-pink-950 dark:via-pink-900 dark:to-red-900 rounded-xl p-5 cursor-pointer hover-elevate active-elevate-2 transition-all duration-300 border-0 shadow-sm group"
                  onClick={() => handleMetricEdit('bloodGroup')}
                  data-testid="card-blood-group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-white/30 dark:bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Droplet className="w-6 h-6 text-pink-600 dark:text-pink-300" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMetricEdit('bloodGroup');
                      }}
                      className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-foreground/70" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-foreground/70 mb-2">Blood Group</p>
                  <p className="text-2xl font-bold text-foreground">
                    {form.getValues('bloodGroup') || '-'}
                  </p>
                </div>

                {/* Weight Card */}
                <div 
                  className="bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 dark:from-emerald-950 dark:via-emerald-900 dark:to-teal-900 rounded-xl p-5 cursor-pointer hover-elevate active-elevate-2 transition-all duration-300 border-0 shadow-sm group"
                  onClick={() => handleMetricEdit('weight')}
                  data-testid="card-weight"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-white/30 dark:bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMetricEdit('weight');
                      }}
                      className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-foreground/70" />
                    </button>
                  </div>
                  <p className="text-xs font-medium text-foreground/70 mb-2">Weight</p>
                  <p className="text-2xl font-bold text-foreground">
                    {form.getValues('weightKg') ? `${form.getValues('weightKg')} kg` : '-'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Edit Metric Dialog */}
            <Dialog open={editingMetric !== null} onOpenChange={(open) => !open && setEditingMetric(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingMetric === 'bloodGroup' ? 'Edit Blood Group' : 'Edit Weight'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {editingMetric === 'bloodGroup' ? (
                    <div className="space-y-2">
                      <Label htmlFor="blood-group-input">Blood Group</Label>
                      <select
                        id="blood-group-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        data-testid="select-blood-group"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="weight-input">Weight (kg)</Label>
                      <Input
                        id="weight-input"
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Enter weight in kg"
                        data-testid="input-weight-edit"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingMetric(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleMetricSave} data-testid="button-save-metric">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Basic Detail Section */}
            <Card className="p-6 border-0 shadow-sm bg-gradient-to-br from-card to-card/50 space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>
              
              <div className="space-y-3">
                <Label htmlFor="fullName" className="font-medium">Full Name</Label>
                <Input
                  id="fullName"
                  {...form.register("fullName")}
                  placeholder="Enter your full name"
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-fullname"
                />
                {form.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="dateOfBirth" className="font-medium">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...form.register("dateOfBirth")}
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-dob"
                />
              </div>

              <div className="space-y-3">
                <Label className="font-medium">Gender</Label>
                <div className="flex gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <RadioGroup
                    value={form.watch("gender")}
                    onValueChange={(value) => form.setValue("gender", value as 'male' | 'female')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <RadioGroupItem value="male" id="male" data-testid="radio-male" />
                      <Label htmlFor="male" className="cursor-pointer font-normal">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2 flex-1">
                      <RadioGroupItem value="female" id="female" data-testid="radio-female" />
                      <Label htmlFor="female" className="cursor-pointer font-normal">Female</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </Card>

            {/* Contact Detail Section */}
            <Card className="p-6 border-0 shadow-sm bg-gradient-to-br from-card to-card/50 space-y-4">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              
              <div className="space-y-3">
                <Label htmlFor="phone" className="font-medium">Mobile Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...form.register("phone")}
                  placeholder="+62 821 1234 1234"
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="your.email@example.com"
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-email"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </Card>

            {/* Personal Detail Section */}
            <Card className="p-6 border-0 shadow-sm bg-gradient-to-br from-card to-card/50 space-y-4">
              <h3 className="font-semibold text-lg">Physical Details</h3>
              
              <div className="space-y-3">
                <Label htmlFor="weightKg" className="font-medium">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  {...form.register("weightKg")}
                  placeholder="64"
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-weight"
                />
                {form.formState.errors.weightKg && (
                  <p className="text-sm text-destructive">{form.formState.errors.weightKg.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="heightCm" className="font-medium">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  step="0.1"
                  {...form.register("heightCm")}
                  placeholder="175.5"
                  className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                  data-testid="input-height"
                />
                {form.formState.errors.heightCm && (
                  <p className="text-sm text-destructive">{form.formState.errors.heightCm.message}</p>
                )}
              </div>
            </Card>

            {/* Save Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg text-base font-semibold transition-all duration-200"
              disabled={updateProfileMutation.isPending || uploadPhotoMutation.isPending}
              data-testid="button-save-profile"
            >
              {(updateProfileMutation.isPending || uploadPhotoMutation.isPending) ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
