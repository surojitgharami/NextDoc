import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string; // YYYY-MM-DD format
  userId?: string;
}

export function NotesModal({
  open,
  onOpenChange,
  selectedDate,
  userId,
}: NotesModalProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load note when modal opens or date changes
  useEffect(() => {
    if (open && userId) {
      loadNote();
    }
  }, [open, selectedDate, userId]);

  const loadNote = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/daily-notes?userId=${userId}&date=${selectedDate}`
      );
      const note = await response.json();
      setContent(note?.content || "");
    } catch (error) {
      console.error("Failed to load note:", error);
      setContent("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/daily-notes", {
        userId,
        date: selectedDate,
        content: content.trim(),
      });

      toast({
        title: "Success",
        description: "Note saved successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;

    if (!confirm("Are you sure you want to delete this note?")) return;

    setIsSaving(true);
    try {
      await apiRequest(
        "DELETE",
        `/api/daily-notes?userId=${userId}&date=${selectedDate}`
      );

      setContent("");
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle>Note for {formatDate(selectedDate)}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <Textarea
              placeholder="Write your daily note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-40 resize-none"
              data-testid="input-note-content"
            />

            <div className="flex gap-2">
              {content && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isSaving}
                  data-testid="button-delete-note"
                >
                  Delete
                </Button>
              )}
              <Button
                className="flex-1 bg-[#6A5DF5] hover:bg-[#5A4DE5]"
                onClick={handleSave}
                disabled={isSaving || !content.trim()}
                data-testid="button-save-note"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
