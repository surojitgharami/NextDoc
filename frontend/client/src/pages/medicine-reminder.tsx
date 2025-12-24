import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/context/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Pill, Droplets, Circle, MoreVertical, Home, Calendar, Plus, FileText, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarModal } from "@/components/CalendarModal";
import { NotesModal } from "@/components/NotesModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMedicineReminders } from "@/hooks/useMedicineReminders";
import type { Medicine } from "@shared/schema";

interface TimeSlot {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

interface GroupedMedicines {
  time: string;
  medicines: Medicine[];
}

interface DateInfo {
  day: string;
  date: string;
  fullDate: string;
}

// Generate dynamic dates for the current week
const generateWeekDates = (): DateInfo[] => {
  const dates: DateInfo[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      day: dayNames[date.getDay()],
      date: date.getDate().toString(),
      fullDate: date.toISOString().split('T')[0], // YYYY-MM-DD format
    });
  }
  return dates;
};

const getMedicineColor = (type: string) => {
  switch (type) {
    case 'tablet':
      // Bright Blue - #2563eb
      return { 
        bg: 'bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-600/50 dark:to-blue-700/35', 
        text: 'text-blue-900 dark:text-blue-100',
        icon: 'text-blue-600 dark:text-blue-100'
      };
    case 'vitamin':
      // Vibrant Purple - #7c3aed
      return { 
        bg: 'bg-gradient-to-br from-violet-400 to-violet-500 dark:from-violet-600/50 dark:to-violet-700/35', 
        text: 'text-violet-900 dark:text-violet-100',
        icon: 'text-violet-600 dark:text-violet-100'
      };
    case 'capsule':
      // Deep Forest Green - #165e37
      return { 
        bg: 'bg-gradient-to-br from-emerald-400 to-emerald-500 dark:from-emerald-700/50 dark:to-emerald-800/35', 
        text: 'text-emerald-900 dark:text-emerald-100',
        icon: 'text-emerald-600 dark:text-emerald-100'
      };
    case 'drops':
      // Warm Brown - #7c2d12
      return { 
        bg: 'bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-700/50 dark:to-orange-800/35', 
        text: 'text-orange-900 dark:text-orange-100',
        icon: 'text-orange-600 dark:text-orange-100'
      };
    default:
      return { 
        bg: 'bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-600/50 dark:to-blue-700/35', 
        text: 'text-blue-900 dark:text-blue-100',
        icon: 'text-blue-600 dark:text-blue-100'
      };
  }
};

const getMedicineIcon = (type: string) => {
  switch (type) {
    case 'tablet':
      return Circle;
    case 'capsule':
      return Pill;
    case 'drops':
      return Droplets;
    case 'vitamin':
      return Circle;
    default:
      return Circle;
  }
};

const formatTimeSlot = (timeSlots: any[]): string => {
  if (!timeSlots || timeSlots.length === 0) return "N/A";
  const first = timeSlots[0];
  return `${first.hour}:${first.minute} ${first.period}`;
};

const groupMedicinesByTime = (medicines: Medicine[]): GroupedMedicines[] => {
  const grouped = new Map<string, Medicine[]>();
  
  medicines.forEach((medicine) => {
    const times = medicine.times as TimeSlot[];
    times.forEach((time) => {
      const timeStr = `${time.hour}:${time.minute} ${time.period}`;
      if (!grouped.has(timeStr)) {
        grouped.set(timeStr, []);
      }
      grouped.get(timeStr)!.push(medicine);
    });
  });

  return Array.from(grouped.entries())
    .map(([time, medicines]) => ({ time, medicines }))
    .sort((a, b) => {
      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        const [hour, minute] = time.split(':').map(Number);
        let hour24 = hour;
        if (period === 'PM' && hour !== 12) hour24 += 12;
        if (period === 'AM' && hour === 12) hour24 = 0;
        return hour24 * 60 + minute;
      };
      return parseTime(a.time) - parseTime(b.time);
    });
};

export default function MedicineReminder() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [intakeStatus, setIntakeStatus] = useState<Record<string, boolean>>({});
  
  // Generate week dates with dynamic updates
  const [weekDates, setWeekDates] = useState<DateInfo[]>(generateWeekDates);
  const todayDate = weekDates[0].fullDate;
  
  // Initialize selectedDate with today's date (fullDate format)
  const [selectedDate, setSelectedDate] = useState(todayDate);

  // Update week dates daily to ensure current week is always displayed
  useEffect(() => {
    const updateWeekDates = () => {
      setWeekDates(generateWeekDates());
      const newTodayDate = generateWeekDates()[0].fullDate;
      setSelectedDate(newTodayDate);
    };

    // Update immediately and then set interval for daily updates
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    
    const midnightTimer = setTimeout(updateWeekDates, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, []);
  
  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ['/medicines', user?.id],
    queryFn: async () => {
      console.log("🔍 [MEDICINE-REMINDER] Fetching medicines for user:", user?.id);
      const response = await apiRequest('GET', `/api/medicines?userId=${user?.id}`);
      const data = await response.json();
      console.log("✅ [MEDICINE-REMINDER] Fetched medicines:", data);
      return data;
    },
    enabled: !!user?.id,
  });

  // Enable medicine time reminders with notifications
  useMedicineReminders(medicines, (medicinesDue) => {
    const medicineNames = medicinesDue.map((m) => m.name).join(", ");
    toast({
      title: "💊 Time to take medicine!",
      description: `It's time for: ${medicineNames}`,
      duration: 10000,
    });
  });

  // Load intake status when medicine data or date changes
  useEffect(() => {
    if (user?.id && medicines.length > 0) {
      medicines.forEach(async (medicine) => {
        try {
          const response = await apiRequest(
            'GET',
            `/api/medicine-intake?userId=${user.id}&medicineId=${medicine.id}&date=${selectedDate}`
          );
          const intakes = await response.json();
          console.log("📥 [INTAKE-STATUS] Loaded for", medicine.name, ":", intakes);
          // Check if there's at least one intake record (meaning medicine was taken)
          setIntakeStatus((prev) => ({
            ...prev,
            [`${medicine.id}_${selectedDate}`]: Array.isArray(intakes) && intakes.length > 0,
          }));
        } catch (error) {
          console.error('Failed to fetch intake status:', error);
          // If endpoint not found (404), assume not taken
          setIntakeStatus((prev) => ({
            ...prev,
            [`${medicine.id}_${selectedDate}`]: false,
          }));
        }
      });
    }
  }, [medicines, selectedDate, user?.id]);

  // Save selected date to localStorage and backend
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`medicineDate_${user.id}`, selectedDate);
    }
  }, [selectedDate, user?.id]);

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ medicineId, isActive }: { medicineId: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/medicines/${medicineId}?userId=${user?.id}`, { isActive: isActive ? 'true' : 'false' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/medicines', user?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update medicine status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (medicineId: string) => {
      const response = await apiRequest('DELETE', `/api/medicines/${medicineId}?userId=${user?.id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/medicines', user?.id] });
      toast({
        title: "Success",
        description: "Medicine deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete medicine",
        variant: "destructive",
      });
    },
  });

  const intakeMutation = useMutation({
    mutationFn: async ({
      medicineId,
      time,
      quantity,
    }: {
      medicineId: string;
      time: string;
      quantity: string;
    }) => {
      console.log("📝 [INTAKE] Recording medicine intake:", { medicineId, time, quantity, date: selectedDate });
      const response = await apiRequest('POST', `/api/medicine-intake`, {
        userId: String(user?.id),
        medicineId,
        date: selectedDate,
        time,
        quantity,
      });
      const result = await response.json();
      console.log("✅ [INTAKE] Response:", result);
      return result;
    },
    onSuccess: (data, { medicineId }) => {
      console.log("🔄 [INTAKE] Updating UI state:", { medicineId, date: selectedDate });
      setIntakeStatus((prev) => ({
        ...prev,
        [`${medicineId}_${selectedDate}`]: true,
      }));
      toast({
        title: "Success",
        description: "Medicine marked as taken",
      });
    },
    onError: (error: any) => {
      console.error("❌ [INTAKE] Error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update medicine intake",
        variant: "destructive",
      });
    },
  });

  const groupedMedicines = groupMedicinesByTime(medicines);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-background to-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/dashboard")}
          className="rounded-xl hover:bg-primary/10 transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-lg font-semibold">Medicine Schedule</h1>
      </header>

      {/* Date Strip */}
      <div className="flex-shrink-0 bg-gradient-to-r from-background/50 to-background/80 backdrop-blur-sm px-4 py-4 overflow-x-auto hide-scrollbar border-b">
        <div className="flex gap-3">
          {weekDates.map((dateInfo) => (
            <button
              key={dateInfo.fullDate}
              onClick={() => setSelectedDate(dateInfo.fullDate)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-all duration-300 font-semibold ${
                selectedDate === dateInfo.fullDate
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-primary/30'
                  : 'bg-card border border-border/50 text-foreground hover-elevate active-elevate-2'
              }`}
              data-testid={`date-${dateInfo.fullDate}`}
            >
              <span className="text-xs font-medium opacity-70">{dateInfo.day}</span>
              <span className="text-lg font-bold mt-1">{dateInfo.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Medicine Schedule */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-background via-background to-muted/20">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : groupedMedicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Pill className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No medicines yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Add your first medicine to get started with reminders</p>
            <Button
              onClick={() => setLocation("/add-medicine")}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              data-testid="button-add-first-medicine"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Medicine
            </Button>
          </div>
        ) : (
          <div className="space-y-8 max-w-2xl mx-auto pb-4">
            {groupedMedicines.map((timeSlot, index) => (
              <div key={index} className="flex gap-4">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 dark:from-primary/50 dark:to-primary/30 border-2 border-primary/40 dark:border-primary/50 flex items-center justify-center shadow-sm flex-shrink-0 backdrop-blur-sm">
                    <span className="text-sm font-bold text-primary dark:text-primary/90">{timeSlot.time.split(':')[0]}</span>
                  </div>
                  {index < groupedMedicines.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/30 dark:from-primary/50 to-primary/10 dark:to-primary/20 min-h-20 my-3"></div>
                  )}
                </div>

                {/* Medicines */}
                <div className="flex-1 space-y-3 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{timeSlot.time}</p>
                  {timeSlot.medicines.map((medicine) => {
                    const colors = getMedicineColor(medicine.type);
                    const Icon = getMedicineIcon(medicine.type);
                    return (
                      <div
                        key={medicine.id}
                        className={`rounded-2xl p-5 shadow-lg transition-all duration-300 ${colors.bg} hover-elevate active-elevate-2 group border-0`}
                        data-testid={`medicine-card-${medicine.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-16 h-16 rounded-2xl bg-white/20 dark:bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 ${colors.icon}`}>
                            <Icon className="w-8 h-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className={`font-bold ${colors.text}`}>{medicine.name}</h3>
                              {intakeStatus[`${medicine.id}_${selectedDate}`] && (
                                <div className={`flex items-center gap-1 bg-white/30 ${colors.text} text-xs font-semibold px-2 py-1 rounded-lg`}>
                                  <Check className="w-3 h-3" />
                                  Done
                                </div>
                              )}
                            </div>
                            <p className={`text-sm font-medium ${colors.text}`}>{medicine.dosage}</p>
                            <p className={`text-xs ${colors.text}`}>{medicine.instruction.replace(/-/g, ' ')}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="icon"
                              type="button"
                              disabled={intakeMutation.isPending || intakeStatus[`${medicine.id}_${selectedDate}`]}
                              className={`h-10 w-10 rounded-lg transition-all duration-200 font-bold text-white cursor-pointer ${
                                intakeStatus[`${medicine.id}_${selectedDate}`]
                                  ? `bg-white/60 shadow-md opacity-100`
                                  : 'border-2 border-white/50 hover:border-white/80 hover:bg-white/20'
                              } ${intakeMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                if (!intakeStatus[`${medicine.id}_${selectedDate}`]) {
                                  const firstTime = medicine.times[0];
                                  const timeStr = `${firstTime.hour}:${firstTime.minute}`;
                                  const dosageMatch = medicine.dosage.match(/(\d+(?:\.\d+)?)/);
                                  const quantity = dosageMatch ? dosageMatch[1] : "1";
                                  console.log("🖱️ [BUTTON] Clicked checkbox for:", { medicine: medicine.id, time: timeStr, qty: quantity });
                                  intakeMutation.mutate({
                                    medicineId: medicine.id,
                                    time: timeStr,
                                    quantity,
                                  });
                                }
                              }}
                              data-testid={`button-mark-taken-${medicine.id}`}
                            >
                              {intakeStatus[`${medicine.id}_${selectedDate}`] && <Check className="w-5 h-5 text-green-600" />}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-9 w-9 rounded-lg hover:bg-white/20 ${colors.text} transition-colors`}
                                  data-testid={`menu-${medicine.id}`}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem data-testid={`edit-${medicine.id}`}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(medicine.id)}
                                  data-testid={`delete-${medicine.id}`}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}</div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-gradient-to-t from-background to-background/95 backdrop-blur-sm border-t px-4 py-3 shadow-lg">
        <div className="flex items-center justify-around max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            data-testid="nav-today"
            onClick={() => setSelectedDate(todayDate)}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Today</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
            data-testid="nav-calendar"
            onClick={() => setCalendarOpen(true)}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-medium">Calendar</span>
          </Button>
          
          <CalendarModal
            open={calendarOpen}
            onOpenChange={setCalendarOpen}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          <Button
            variant="ghost"
            className="flex-col h-auto py-2 gap-1 flex-1"
            onClick={() => setLocation("/add-medicine")}
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
            onClick={() => setNotesOpen(true)}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs font-medium">Notes</span>
          </Button>
          
          <NotesModal
            open={notesOpen}
            onOpenChange={setNotesOpen}
            selectedDate={selectedDate}
            userId={user?.id}
          />
        </div>
      </nav>
    </div>
  );
}
