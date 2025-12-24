import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string; // YYYY-MM-DD format
  onDateSelect: (date: string) => void;
}

export function CalendarModal({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
}: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = selected.toISOString().split('T')[0];
    onDateSelect(dateString);
    onOpenChange(false);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const days: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedDateObj = new Date(selectedDate);
  const isCurrentMonth =
    selectedDateObj.getFullYear() === currentDate.getFullYear() &&
    selectedDateObj.getMonth() === currentDate.getMonth();
  const selectedDay = isCurrentMonth ? selectedDateObj.getDate() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700">
        <DialogHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg px-6 py-4 shadow-lg">
          <DialogTitle className="text-xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 bg-background">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button
              size="icon"
              className="h-9 w-9 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
              onClick={previousMonth}
              data-testid="button-prev-month"
              variant="ghost"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-base font-bold text-foreground">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              size="icon"
              className="h-9 w-9 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
              onClick={nextMonth}
              data-testid="button-next-month"
              variant="ghost"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => (
              <div key={index}>
                {day === null ? (
                  <div className="aspect-square" />
                ) : (
                  <button
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square rounded-xl text-sm font-semibold transition-all duration-200 ${
                      day === selectedDay
                        ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg ring-2 ring-primary/30"
                        : "bg-card hover:bg-card/80 text-foreground border border-border/50 hover:border-primary/30 hover:shadow-md"
                    }`}
                    data-testid={`date-${day}`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
