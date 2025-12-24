
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContentData {
  title: string;
  content: string;
  updated_at?: string;
}

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "terms" | "privacy_policy";
}

export function PolicyModal({ isOpen, onClose, type }: PolicyModalProps) {
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchContent();
    }
  }, [isOpen, type]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${type}`);
      if (!res.ok) throw new Error("Failed to fetch content");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load content. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const Icon = type === "terms" ? FileText : Shield;
  const defaultTitle = type === "terms" ? "Terms & Conditions" : "Privacy Policy";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/80 backdrop-blur-xl border-white/10 dark:border-white/10 shadow-2xl">
        <DialogHeader className="p-6 border-b border-border/40 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <DialogTitle className="text-xl font-semibold tracking-tight">
                        {data?.title || defaultTitle}
                    </DialogTitle>
                    {data?.updated_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Last updated: {new Date(data.updated_at).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : data ? (
                <ScrollArea className="h-full w-full p-6">
                    <div className="prose max-w-none text-sm leading-relaxed prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline text-slate-700 dark:text-slate-200">
                        <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 m-0 border-0 text-slate-700 dark:text-slate-200">{data.content}</pre>
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
                    <AlertCircle className="w-8 h-8 opacity-50" />
                    <p>No content available.</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
