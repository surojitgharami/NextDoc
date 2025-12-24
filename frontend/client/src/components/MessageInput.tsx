import { useState, useRef, useEffect } from "react";
import { Send, Mic, Image as ImageIcon, ImagePlus, X, StopCircle, Check, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageUpload?: (file: File) => void;
  onAudioSend?: (file: File) => void;
  onRemoveAttachment?: () => void;
  onS2SStart?: () => void;
  onS2SStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  onStop?: () => void;
}

export default function MessageInput({
  value = "",
  onChange,
  onSend,
  onImageUpload,
  onAudioSend,
  onRemoveAttachment,
  onS2SStart,
  onS2SStop,
  disabled = false,
  placeholder = "Type Here...",
  onStop
}: MessageInputProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isS2SMode, setIsS2SMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Pre-compute safe values to avoid trim() errors during render
  const safeValue = value || "";
  const trimmedValue = safeValue.trim();
  const hasTextContent = trimmedValue.length > 0;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [safeValue]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!trimmedValue && !selectedImage && !recordedAudio) return;
    onSend();
    setSelectedImage(null);
    setRecordedAudio(null);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedImage(file);
      if (onImageUpload) {
        onImageUpload(file);
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemoveAttachment) {
      onRemoveAttachment();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        
        setRecordedAudio(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    setRecordedAudio(null);
  };

  const confirmRecording = () => {
    if (recordedAudio && onAudioSend) {
      onAudioSend(recordedAudio);
      setRecordedAudio(null);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleS2SToggle = () => {
    if (isS2SMode) {
      setIsS2SMode(false);
      onS2SStop?.();
    } else {
      setIsS2SMode(true);
      onS2SStart?.();
    }
  };

  return (
    <div className="space-y-2">
      {selectedImage && (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          <span className="text-sm flex-1 truncate">{selectedImage.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemoveImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-muted/30 rounded-full px-2 py-2 border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-9 w-9"
          onClick={handleImageClick}
          disabled={disabled || isRecording || recordedAudio !== null}
          data-testid="button-attach"
        >
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {isRecording ? (
          <div className="flex-1 flex items-center gap-2 px-3">
            <div className="flex items-center gap-2 text-primary">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
            </div>
          </div>
        ) : recordedAudio ? (
          <div className="flex-1 flex items-center gap-2 px-3">
            <Mic className="w-4 h-4" />
            <span className="text-sm">Voice message ready</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none outline-none text-sm placeholder:text-muted-foreground py-2 max-h-[120px]"
            data-testid="input-message"
          />
        )}

        {isRecording ? (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
            onClick={stopRecording}
            data-testid="button-stop-recording"
          >
            <StopCircle className="w-5 h-5" />
          </Button>
        ) : recordedAudio ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-red-500/10"
              onClick={cancelRecording}
              data-testid="button-cancel-voice"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-green-500/10"
              onClick={confirmRecording}
              data-testid="button-confirm-voice"
            >
              <Check className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-9 w-9 rounded-full"
            onClick={startRecording}
            disabled={disabled || hasTextContent}
            data-testid="button-voice"
          >
            <Mic className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}

        {disabled && onStop ? (
          <Button
            size="icon"
            className="flex-shrink-0 h-9 w-9 rounded-full bg-orange-500/20 text-orange-600 hover:bg-orange-500/30"
            onClick={onStop}
            data-testid="button-stop"
            title="Stop thinking"
          >
            <StopCircle className="w-4 h-4" />
          </Button>
        ) : recordedAudio ? null : hasTextContent ? (
          <Button
            size="icon"
            className="flex-shrink-0 h-9 w-9 rounded-full"
            onClick={handleSend}
            disabled={disabled}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            className={`flex-shrink-0 h-10 w-10 rounded-full bg-black text-white hover:bg-gray-800 transition-all flex items-center justify-center ${
              isS2SMode ? 'animate-pulse shadow-lg shadow-black/50' : ''
            }`}
            onClick={handleS2SToggle}
            disabled={disabled || selectedImage !== null}
            data-testid="button-s2s"
            title={isS2SMode ? "Stop conversation mode" : "Start conversation mode"}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="2" opacity="0.8" />
              <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
