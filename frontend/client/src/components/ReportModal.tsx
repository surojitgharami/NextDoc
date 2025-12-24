import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, FileWarning, Shield, HelpCircle } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  sessionId: string;
  messagePreview?: string;
}

type ReportReason = "incorrect_info" | "offensive" | "privacy" | "other";

const REPORT_REASONS: { value: ReportReason; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "incorrect_info",
    label: "Incorrect Information",
    description: "The response contains factually wrong or misleading information",
    icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
  },
  {
    value: "offensive",
    label: "Offensive Content",
    description: "The response contains inappropriate or harmful content",
    icon: <FileWarning className="h-4 w-4 text-red-500" />,
  },
  {
    value: "privacy",
    label: "Privacy Concern",
    description: "The response reveals or requests sensitive personal information",
    icon: <Shield className="h-4 w-4 text-blue-500" />,
  },
  {
    value: "other",
    label: "Other",
    description: "Another issue not covered above",
    icon: <HelpCircle className="h-4 w-4 text-gray-500" />,
  },
];

export default function ReportModal({
  isOpen,
  onClose,
  messageId,
  sessionId,
  messagePreview,
}: ReportModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Select a reason",
        description: "Please select a reason for your report",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/message-reports", {
        message_id: messageId,
        session_id: sessionId,
        reason,
        comment: comment.trim() || null,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit report");
      }

      toast({
        title: "Report submitted",
        description: "Thank you for your feedback. Our team will review it.",
      });

      setReason(null);
      setComment("");
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason(null);
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report AI Response</DialogTitle>
          <DialogDescription>
            Help us improve by reporting issues with AI responses. Your feedback helps us make the system better.
          </DialogDescription>
        </DialogHeader>

        {messagePreview && (
          <div className="bg-muted p-3 rounded-lg text-sm max-h-24 overflow-y-auto">
            <p className="text-muted-foreground text-xs mb-1">Message being reported:</p>
            <p className="line-clamp-3">{messagePreview}</p>
          </div>
        )}

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">What's the issue?</Label>
            <RadioGroup
              value={reason || ""}
              onValueChange={(value) => setReason(value as ReportReason)}
              className="space-y-2"
            >
              {REPORT_REASONS.map((item) => (
                <div
                  key={item.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === item.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setReason(item.value)}
                >
                  <RadioGroupItem value={item.value} id={item.value} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <Label htmlFor={item.value} className="font-medium cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Additional details (optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Provide more context about the issue..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !reason}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
