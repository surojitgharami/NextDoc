import { useState, useEffect } from "react";
import { useUser, useAuth } from "@/context/auth-context";
import { ArrowLeft, Camera, Droplet, Activity, Edit2, Save, User, Mail, Phone, Calendar, Ruler } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { motion } from "framer-motion";

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
  phone: z.string().optional().refine(val => !val || /^\d{10}$/.test(val), {
    message: "Phone number must be exactly 10 digits"
  }),
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
      
      // Determine what has changed manually
      let dataToSubmit: Partial<ProfileFormData> = {};
      
      if (profileData) {
         // Compare each field manually to safely detect changes, including Blood Group
         // which might not trigger dirty state perfectly from modal
         const currentValues = form.getValues();
         
         const hasChanged = (key: keyof ProfileFormData, originalValue: any) => {
            const currentValue = currentValues[key];
            // Handle null/undefined checks loosely
            if (!originalValue && !currentValue) return false;
            // Handle number conversions
            if (key === 'weightKg' || key === 'heightCm') {
                return String(originalValue || '') !== String(currentValue || '');
            }
            return originalValue !== currentValue;
         };

         if (hasChanged('fullName', profileData.fullName)) dataToSubmit.fullName = data.fullName;
         if (hasChanged('dateOfBirth', profileData.dateOfBirth)) dataToSubmit.dateOfBirth = data.dateOfBirth;
         if (hasChanged('gender', profileData.gender)) dataToSubmit.gender = data.gender;
         if (hasChanged('phone', profileData.phone)) dataToSubmit.phone = data.phone;
         if (hasChanged('bloodGroup', profileData.bloodGroup)) dataToSubmit.bloodGroup = data.bloodGroup;
         if (hasChanged('weightKg', profileData.weightKg)) dataToSubmit.weightKg = data.weightKg;
         if (hasChanged('heightCm', profileData.heightCm)) dataToSubmit.heightCm = data.heightCm;

         // If nothing changed and no file selected, return
         if (Object.keys(dataToSubmit).length === 0 && !selectedFile) {
            return;
         }
         
         // If only file changed, we are done
         if (Object.keys(dataToSubmit).length === 0) {
             return;
         }

      } else {
        // No existing profile, send everything
        dataToSubmit = data;
      }

      // Convert empty strings to null for numeric fields and prepare payload
      const payload: any = { ...dataToSubmit };
      
      if ('weightKg' in payload) {
        payload.weightKg = payload.weightKg ? parseFloat(String(payload.weightKg)) : null;
      }
      
      if ('heightCm' in payload) {
        payload.heightCm = payload.heightCm ? parseFloat(String(payload.heightCm)) : null;
      }
      
      // Then update profile
      if (Object.keys(payload).length > 0) {
        await updateProfileMutation.mutateAsync(payload as ProfileFormData);
      }
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
    const newValue = metric === 'bloodGroup' 
      ? (form.getValues('bloodGroup') || '') 
      : (form.getValues('weightKg') || '');
    setEditValue(newValue);
    setEditingMetric(metric);
  };

  const handleMetricSave = () => {
    if (editingMetric === 'bloodGroup') {
      form.setValue('bloodGroup', editValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    } else if (editingMetric === 'weight') {
      form.setValue('weightKg', editValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    setEditingMetric(null);
    setEditValue('');
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-80 bg-primary/5 rounded-b-[40%] blur-3xl -z-10" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b px-6 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Personal Information
            </h1>
        </header>

        <div className="px-6 py-8 space-y-8">
          {/* Avatar Section */}
          <div className="flex justify-center py-4">
            <div className="relative group">
               <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
               >
                  <Avatar className="w-40 h-40 border-4 border-background ring-4 ring-primary/20 shadow-xl">
                    <AvatarImage src={currentAvatar} className="object-cover" />
                    <AvatarFallback className="text-5xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute bottom-1 right-2"
              >
                  <Button
                    size="icon"
                    className="rounded-full w-12 h-12 bg-primary text-primary-foreground shadow-lg border-4 border-background hover:bg-primary/90 transition-all duration-200"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    data-testid="button-change-photo"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
              </motion.div>
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

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Health Stats Grid */}
            <div className="grid grid-cols-2 gap-5">
                 {/* Blood Group Card */}
                 <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                 >
                    <Card 
                      className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-background cursor-pointer hover:shadow-pink-100 dark:hover:shadow-pink-900/20 transition-all duration-300"
                      onClick={() => handleMetricEdit('bloodGroup')}
                    >
                        <CardContent className="p-5 flex flex-col h-full justify-between relative">
                            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 className="w-4 h-4 text-pink-400" />
                            </div>
                           <div className="flex items-center gap-3 mb-3">
                               <div className="p-2.5 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400">
                                   <Droplet className="w-6 h-6" />
                               </div>
                               <span className="font-medium text-pink-900 dark:text-pink-100/80">Blood Group</span>
                           </div>
                           <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                               {form.watch('bloodGroup') || '-'}
                           </p>
                        </CardContent>
                    </Card>
                 </motion.div>

                 {/* Weight Card */}
                 <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                 >
                     <Card 
                       className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background cursor-pointer hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20 transition-all duration-300"
                       onClick={() => handleMetricEdit('weight')}
                     >
                        <CardContent className="p-5 flex flex-col h-full justify-between">
                           <div className="flex items-center gap-3 mb-3">
                               <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                                   <Activity className="w-6 h-6" />
                               </div>
                               <span className="font-medium text-emerald-900 dark:text-emerald-100/80">Weight</span>
                           </div>
                           <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                               {form.watch('weightKg') ? `${form.watch('weightKg')} kg` : '-'}
                           </p>
                        </CardContent>
                    </Card>
                 </motion.div>
            </div>

            {/* Edit Metric Dialog */}
            <Dialog open={editingMetric !== null} onOpenChange={(open) => !open && setEditingMetric(null)}>
              <DialogContent className="sm:max-w-md rounded-2xl" aria-describedby="dialog-description">
                <DialogHeader>
                  <DialogTitle>
                    {editingMetric === 'bloodGroup' ? 'Update Blood Group' : 'Update Weight'}
                  </DialogTitle>
                   <p id="dialog-description" className="text-sm text-muted-foreground">
                      {editingMetric === 'bloodGroup' 
                        ? 'Select your blood group from the list below.' 
                        : 'Enter your current weight in kilograms.'}
                    </p>
                </DialogHeader>
                
                <div className="py-4">
                  {editingMetric === 'bloodGroup' ? (
                    <div className="space-y-3">
                      <Label htmlFor="blood-group-input" className="text-sm font-medium text-muted-foreground">Select Blood Group</Label>
                      <select
                        id="blood-group-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                    <div className="space-y-3">
                      <Label htmlFor="weight-input" className="text-sm font-medium text-muted-foreground">Weight (kg)</Label>
                      <div className="relative">
                          <Input
                            id="weight-input"
                            type="number"
                            step="0.1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-12 pl-4 pr-12 rounded-xl text-lg font-medium"
                            placeholder="0.0"
                          />
                          <span className="absolute right-4 top-3 text-muted-foreground font-medium">kg</span>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setEditingMetric(null)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleMetricSave} className="rounded-xl bg-primary hover:bg-primary/90">
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Basic Information Card */}
                <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="w-5 h-5 text-primary" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-muted-foreground">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                id="fullName"
                                {...form.register("fullName")}
                                placeholder="Enter your full name"
                                className="pl-10 h-11 rounded-xl bg-background/50 border-input/50 focus:bg-background transition-all"
                                />
                            </div>
                            {form.formState.errors.fullName && (
                                <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth" className="text-muted-foreground">Date of Birth</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                id="dateOfBirth"
                                type="date"
                                {...form.register("dateOfBirth")}
                                className="pl-10 h-11 rounded-xl bg-background/50 border-input/50 focus:bg-background transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Gender</Label>
                            <RadioGroup
                                value={form.watch("gender")}
                                onValueChange={(value) => form.setValue("gender", value as 'male' | 'female', { shouldDirty: true })}
                                className="grid grid-cols-2 gap-4"
                            >
                                <div className={`flex items-center justify-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all ${form.watch("gender") === 'male' ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/50'}`}>
                                    <RadioGroupItem value="male" id="male" />
                                    <Label htmlFor="male" className="cursor-pointer font-medium">Male</Label>
                                </div>
                                <div className={`flex items-center justify-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all ${form.watch("gender") === 'female' ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/50'}`}>
                                    <RadioGroupItem value="female" id="female" />
                                    <Label htmlFor="female" className="cursor-pointer font-medium">Female</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>

            {/* Contact Information Card */}
             <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Phone className="w-5 h-5 text-primary" />
                        Contact & Physical
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-muted-foreground">Mobile Number</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">+91</span>
                            <Input
                            id="phone"
                            type="tel"
                            maxLength={10}
                            {...form.register("phone")}
                            placeholder="1234567890"
                            className="pl-12 h-11 rounded-xl bg-background/50 border-input/50 focus:bg-background transition-all"
                            />
                        </div>
                         {form.formState.errors.phone && (
                            <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                            id="email"
                            type="email"
                            {...form.register("email")}
                            disabled
                            className="pl-10 h-11 rounded-xl bg-muted/40 text-muted-foreground border-transparent"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                         <Label htmlFor="heightCm" className="text-muted-foreground">Height</Label>
                        <div className="relative">
                             <Ruler className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                             <Input
                                id="heightCm"
                                type="number"
                                step="0.1"
                                {...form.register("heightCm")}
                                placeholder="175.5"
                                className="pl-10 pr-12 h-11 rounded-xl bg-background/50 border-input/50 focus:bg-background transition-all"
                             />
                             <span className="absolute right-4 top-3 text-muted-foreground text-sm font-medium">cm</span>
                        </div>
                    </div>
                </CardContent>
             </Card>

            {/* Save Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                type="submit"
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 text-lg font-bold rounded-2xl transition-all duration-300"
                disabled={updateProfileMutation.isPending || uploadPhotoMutation.isPending}
                data-testid="button-save-profile"
                >
                {(updateProfileMutation.isPending || uploadPhotoMutation.isPending) ? (
                    <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving Changes...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <Save className="w-5 h-5" />
                        Save Changes
                    </span>
                )}
                </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
