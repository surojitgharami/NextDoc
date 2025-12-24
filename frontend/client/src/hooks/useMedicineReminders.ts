import { useEffect, useRef } from "react";
import type { Medicine } from "@shared/schema";

interface TimeSlot {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
}

export function useMedicineReminders(medicines: Medicine[] | undefined, onReminder?: (medicines: Medicine[]) => void) {
  const notifiedTodayRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!medicines || medicines.length === 0) {
      console.log("📭 [REMINDER] No medicines to remind about");
      return;
    }

    console.log("💊 [REMINDER] Initialized with medicines:", medicines.map(m => m.name));

    // Request notification permission upfront
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        console.log("🔔 [REMINDER] Requesting notification permission...");
        Notification.requestPermission().then((permission) => {
          console.log("🔔 [REMINDER] Notification permission:", permission);
        });
      } else {
        console.log("🔔 [REMINDER] Notification permission status:", Notification.permission);
      }
    }

    // Check current time against medicine times every 10 seconds (more frequent for accuracy)
    const checkMedicineTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSeconds = now.getSeconds();

      // Convert 24hr format to 12hr format for comparison
      let hour12 = currentHour % 12 || 12;
      const period = currentHour >= 12 ? 'PM' : 'AM';
      const hour12Str = String(hour12).padStart(2, '0');
      const minute12Str = String(currentMinute).padStart(2, '0');
      const currentTimeFormatted = `${hour12Str}:${minute12Str} ${period}`;

      // Only log every minute to avoid spam
      const currentMinuteKey = currentHour * 60 + currentMinute;
      if (lastCheckRef.current !== currentMinuteKey && currentSeconds < 15) {
        console.log(`🕐 [REMINDER] Checking at ${currentTimeFormatted} (${currentHour}:${String(currentMinute).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')})`);
        lastCheckRef.current = currentMinuteKey;
      }

      medicines.forEach((medicine) => {
        const times = (medicine.times as TimeSlot[]) || [];
        
        times.forEach((timeSlot) => {
          const medicineTimeStr = `${timeSlot.hour}:${timeSlot.minute}${timeSlot.period}`;
          
          // Debug logging for scheduled times
          if (lastCheckRef.current !== currentMinuteKey && currentSeconds < 15) {
            console.log(`  📋 ${medicine.name}: scheduled at ${medicineTimeStr}`);
          }
          
          // Check if current time matches medicine time (within same minute)
          const timeMatches = 
            hour12Str === timeSlot.hour &&
            minute12Str === timeSlot.minute &&
            period === timeSlot.period;

          if (timeMatches && !notifiedTodayRef.current.has(medicineTimeStr)) {
            console.log(`🎯 [REMINDER] TIME MATCH! ${medicine.name} at ${medicineTimeStr}`);
            
            // Mark as notified to avoid duplicate alerts
            notifiedTodayRef.current.add(medicineTimeStr);
            
            // Trigger callback with medicines due at this time
            const medicinesDueNow = medicines.filter((m) => {
              const mTimes = (m.times as TimeSlot[]) || [];
              return mTimes.some(
                (t) => t.hour === timeSlot.hour && t.minute === timeSlot.minute && t.period === timeSlot.period
              );
            });

            console.log(`✅ [REMINDER] Medicines due now:`, medicinesDueNow.map(m => m.name));

            if (onReminder && medicinesDueNow.length > 0) {
              console.log(`🔊 [REMINDER] Calling onReminder callback`);
              onReminder(medicinesDueNow);
            }

            // Try to show browser notification
            if (typeof Notification !== "undefined") {
              if (Notification.permission === "granted") {
                console.log(`🔔 [REMINDER] Showing browser notification`);
                try {
                  const medicineNames = medicinesDueNow.map((m) => m.name).join(", ");
                  const notification = new Notification("💊 Time to take medicine!", {
                    body: `It's time for: ${medicineNames}`,
                    tag: medicineTimeStr,
                    requireInteraction: true,
                    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235b21b6'><circle cx='12' cy='12' r='10'/><text x='12' y='16' text-anchor='middle' font-size='20' fill='white'>💊</text></svg>",
                  });
                  
                  // Auto-close after 10 seconds if no interaction
                  setTimeout(() => {
                    notification.close();
                  }, 10000);
                } catch (error) {
                  console.error("❌ [REMINDER] Error showing notification:", error);
                }
              } else {
                console.log(`⚠️ [REMINDER] Notification permission not granted:`, Notification.permission);
              }
            } else {
              console.log(`⚠️ [REMINDER] Notifications not supported`);
            }
          }
        });
      });
    };

    // Run check immediately and then every 10 seconds (more frequent for better accuracy)
    checkMedicineTime();
    const interval = setInterval(checkMedicineTime, 10000);

    console.log("⏰ [REMINDER] Started checking medicine times every 10 seconds");

    // Reset notified medicines at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      console.log("🌙 [REMINDER] Resetting notifications for new day");
      notifiedTodayRef.current.clear();
      lastCheckRef.current = 0;
    }, timeUntilMidnight);

    return () => {
      console.log("🛑 [REMINDER] Cleaning up reminder hook");
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
  }, [medicines, onReminder]);
}
