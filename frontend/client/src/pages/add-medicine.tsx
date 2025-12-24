import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useUser } from "@/context/auth-context";
import { useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, Settings, Pill, Circle, Droplets, Home, Calendar, 
  Plus, FileText, Settings as SettingsIcon, X, Flame, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type MedicineType = 'capsule' | 'tablet' | 'drops' | 'vitamin';

interface TimeSlot {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

const addMedicineSchema = z.object({
  type: z.enum(['capsule', 'tablet', 'drops', 'vitamin']),
  name: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  strength: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  frequency: z.string().min(1, "Frequency is required"),
  instruction: z.string().min(1, "Instruction is required"),
  notification: z.boolean(),
  sound: z.boolean(),
  vibration: z.boolean(),
});

type AddMedicineForm = z.infer<typeof addMedicineSchema>;

export default function AddMedicine() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [selectedType, setSelectedType] = useState<MedicineType>('tablet');
  const [times, setTimes] = useState<TimeSlot[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState<TimeSlot>({ hour: "08", minute: "00", period: "AM" });

  const form = useForm<AddMedicineForm>({
    resolver: zodResolver(addMedicineSchema),
    defaultValues: {
      type: 'tablet',
      name: "",
      dosage: "",
      strength: "",
      duration: "7 days",
      frequency: "Daily",
      instruction: "",
      notification: true,
      sound: true,
      vibration: false,
    },
  });

  const medicineTypes = [
    { id: 'capsule', label: 'Capsule', icon: Pill, color: 'bg-green-50 border-green-200 text-green-600' },
    { id: 'tablet', label: 'Tablet', icon: Circle, color: 'bg-blue-50 border-blue-200 text-blue-600' },
    { id: 'drops', label: 'Drops', icon: Droplets, color: 'bg-orange-50 border-orange-200 text-orange-600' },
    { id: 'vitamin', label: 'Vitamin', icon: Flame, color: 'bg-purple-50 border-purple-200 text-purple-600' },
  ];

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const addTime = () => {
    if (showTimePicker) {
      setTimes([...times, currentTime]);
      setShowTimePicker(false);
      setCurrentTime({ hour: "08", minute: "00", period: "AM" });
    } else {
      setShowTimePicker(true);
    }
  };

  const removeTime = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const createMedicineMutation = useMutation({
    mutationFn: async (medicineData: any) => {
      const userIdStr = String(medicineData.userId);
      console.log("📝 [ADD-MEDICINE] Sending data:", {
        userId: userIdStr.substring(0, 10) + "...",
        name: medicineData.name,
        type: medicineData.type,
        times: medicineData.times
      });
      const response = await apiRequest('POST', '/api/medicines', medicineData);
      const saved = await response.json();
      console.log("✅ [ADD-MEDICINE] Saved successfully:", saved);
      return saved;
    },
    onSuccess: async (savedMedicine) => {
      console.log("🔄 [ADD-MEDICINE] Invalidating cache for user:", user?.id);
      
      // Invalidate the query
      await queryClient.invalidateQueries({ queryKey: ['/medicines', user?.id] });
      
      console.log("🔄 [ADD-MEDICINE] Refetching medicines...");
      // Refetch to get fresh data
      const refetchResult = await queryClient.refetchQueries({ 
        queryKey: ['/medicines', user?.id],
        type: 'active'
      });
      
      console.log("✅ [ADD-MEDICINE] Refetch complete, result:", refetchResult);
      
      toast({
        title: "Success",
        description: "Medicine added successfully",
      });
      
      // Small delay to ensure UI updates before navigation
      setTimeout(() => {
        console.log("🚀 [ADD-MEDICINE] Navigating to medicine-reminder");
        setLocation("/medicine-reminder");
      }, 300);
    },
    onError: (error: any) => {
      console.error("❌ [ADD-MEDICINE] Error:", error);
      const errorMessage = error?.message || "Failed to add medicine";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddMedicineForm) => {
    if (times.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one time for the medicine",
        variant: "destructive",
      });
      return;
    }

    const medicineData = {
      userId: String(user?.id),
      type: data.type,
      name: data.name,
      dosage: data.dosage,
      strength: data.strength || null,
      times: times,
      duration: data.duration,
      frequency: data.frequency,
      instruction: data.instruction,
      notification: data.notification ? 'true' : 'false',
      sound: data.sound ? 'true' : 'false',
      vibration: data.vibration ? 'true' : 'false',
    };

    createMedicineMutation.mutate(medicineData);
  };

  const getTypeColor = () => {
    switch (selectedType) {
      case 'capsule': return 'bg-green-50 border-green-200';
      case 'tablet': return 'bg-blue-50 border-blue-200';
      case 'drops': return 'bg-orange-50 border-orange-200';
      case 'vitamin': return 'bg-purple-50 border-purple-200';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-background to-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/medicine-reminder")}
          className="rounded-xl hover:bg-primary/10 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold">Add Medicine</h1>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-primary/10 transition-colors"
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
              
              {/* Top Illustration */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-8 shadow-sm border border-primary/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg border border-primary/20">
                    <Pill className="w-16 h-16 text-primary" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Choose your medicine type</p>
                </div>
              </div>

              {/* Medicine Type Selector */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Medicine Type</FormLabel>
                    <div className="grid grid-cols-4 gap-3">
                      {medicineTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.id;
                        const typeColorMap: Record<string, string> = {
                          capsule: 'from-green-50 to-green-50 dark:from-green-950 dark:to-green-900 text-green-600 dark:text-green-300',
                          tablet: 'from-blue-50 to-blue-50 dark:from-blue-950 dark:to-blue-900 text-blue-600 dark:text-blue-300',
                          drops: 'from-orange-50 to-orange-50 dark:from-orange-950 dark:to-orange-900 text-orange-600 dark:text-orange-300',
                          vitamin: 'from-purple-50 to-purple-50 dark:from-purple-950 dark:to-purple-900 text-purple-600 dark:text-purple-300'
                        };
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              setSelectedType(type.id as MedicineType);
                              field.onChange(type.id);
                            }}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-0 transition-all duration-300 shadow-sm hover-elevate active-elevate-2 ${
                              isSelected 
                                ? `bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-primary/30 scale-105` 
                                : `bg-gradient-to-br ${typeColorMap[type.id] || typeColorMap.tablet}`
                            }`}
                            data-testid={`type-${type.id}`}
                          >
                            <Icon className="w-8 h-8" />
                            <span className="text-xs font-semibold">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* General Information */}
              <div className="bg-gradient-to-br from-card to-card/50 rounded-xl p-6 shadow-sm border-0 space-y-4">
                <h2 className="text-base font-semibold">General Information</h2>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Medicine Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Paracetamol"
                          className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                          data-testid="input-medicine-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dosage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Dosage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg border-border/50 focus:border-primary/50 transition-colors" data-testid="select-dosage">
                            <SelectValue placeholder="Select dosage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1 tablet">1 tablet</SelectItem>
                          <SelectItem value="2 tablets">2 tablets</SelectItem>
                          <SelectItem value="1 capsule">1 capsule</SelectItem>
                          <SelectItem value="2 capsules">2 capsules</SelectItem>
                          <SelectItem value="20 drops">20 drops</SelectItem>
                          <SelectItem value="1 teaspoon">1 teaspoon</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="strength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Strength (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 500mg or 1200 IU"
                          className="rounded-lg border-border/50 focus:border-primary/50 transition-colors"
                          data-testid="input-strength"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Scheduling Section */}
              <div className="bg-gradient-to-br from-card to-card/50 rounded-xl p-6 shadow-sm border-0 space-y-4">
                <h2 className="text-base font-semibold">Schedule</h2>
                
                {/* Time Slots */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Time</Label>
                  <div className="space-y-2">
                    {times.map((time, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 border border-border/50"
                      >
                        <span className="flex-1 text-sm font-medium">
                          {time.hour}:{time.minute} {time.period}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-muted/50"
                          onClick={() => removeTime(index)}
                          data-testid={`remove-time-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {showTimePicker && (
                      <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border/50">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs font-medium">Hour</Label>
                            <Select
                              value={currentTime.hour}
                              onValueChange={(value) => setCurrentTime({ ...currentTime, hour: value })}
                            >
                              <SelectTrigger className="rounded-lg h-10 border-border/50" data-testid="select-hour">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {hours.map((h) => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Minute</Label>
                            <Select
                              value={currentTime.minute}
                              onValueChange={(value) => setCurrentTime({ ...currentTime, minute: value })}
                            >
                              <SelectTrigger className="rounded-lg h-10 border-border/50" data-testid="select-minute">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {minutes.filter((_, i) => i % 5 === 0).map((m) => (
                                  <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Period</Label>
                            <Select
                              value={currentTime.period}
                              onValueChange={(value) => setCurrentTime({ ...currentTime, period: value as 'AM' | 'PM' })}
                            >
                              <SelectTrigger className="rounded-lg h-10 border-border/50" data-testid="select-period">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button
                      type="button"
                      className="w-full rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors"
                      onClick={addTime}
                      data-testid="button-add-time"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {showTimePicker ? "Confirm Time" : "Add Time"}
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Duration</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg border-border/50" data-testid="select-duration">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3 days">3 days</SelectItem>
                          <SelectItem value="7 days">7 days</SelectItem>
                          <SelectItem value="14 days">14 days</SelectItem>
                          <SelectItem value="1 month">1 month</SelectItem>
                          <SelectItem value="3 months">3 months</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-lg border-border/50" data-testid="select-frequency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Alternate days">Alternate days</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Instructions Section */}
              <FormField
                control={form.control}
                name="instruction"
                render={({ field }) => (
                  <FormItem>
                    <div className="bg-gradient-to-br from-card to-card/50 rounded-xl p-6 shadow-sm border-0 space-y-4">
                      <FormLabel className="text-base font-semibold">Instructions</FormLabel>
                      <div className="space-y-3">
                        {[
                          { value: 'before-food', label: 'Take before food', icon: Sun },
                          { value: 'after-meal', label: 'Take after meal', icon: Flame },
                          { value: 'bedtime', label: 'At bedtime', icon: Moon },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = field.value === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => field.onChange(item.value)}
                              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' 
                                  : 'border-border/50 bg-card/50 text-foreground hover:bg-card/80 hover-elevate'
                              }`}
                              data-testid={`instruction-${item.value}`}
                            >
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-sm font-medium">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Reminder Options */}
              <div className="bg-gradient-to-br from-card to-card/50 rounded-xl p-6 shadow-sm border-0 space-y-4">
                <h2 className="text-base font-semibold">Reminder Options</h2>
                
                <FormField
                  control={form.control}
                  name="notification"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium">Notification</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="toggle-notification"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sound"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium">Sound</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="toggle-sound"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vibration"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm font-medium">Vibration</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="toggle-vibration"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

            </div>
          </div>

          {/* Sticky Bottom Button */}
          <div className="flex-shrink-0 p-4 bg-gradient-to-t from-background to-background/95 backdrop-blur-sm border-t shadow-lg">
            <Button
              type="submit"
              className="w-full rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg text-primary-foreground transition-all duration-200"
              data-testid="button-add-medicine"
            >
              Add Medicine
            </Button>
          </div>
        </form>
      </Form>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-gradient-to-t from-background to-background/95 backdrop-blur-sm border-t px-4 py-3 shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => setLocation("/medicine-reminder")}
            data-testid="nav-today"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Today</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            data-testid="nav-calendar"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-medium">Calendar</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1"
            data-testid="nav-add"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center -mt-6 shadow-lg hover:from-primary/90 hover:to-primary/70 transition-all duration-200">
              <Plus className="w-6 h-6 text-primary-foreground" />
            </div>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            data-testid="nav-notes"
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs font-medium">Notes</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => setLocation("/settings")}
            data-testid="nav-settings"
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-xs font-medium">Settings</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
