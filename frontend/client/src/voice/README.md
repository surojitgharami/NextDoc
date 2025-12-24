# Voice Components

Voice recording and processing components for AI Doctor chat interface.

## Components

### VoiceRecorder

Full-featured voice recorder component with recording, transcription, and speech-to-speech capabilities.

**Props:**
- `mode?: "stt" | "s2s"` — Recording mode (default: "stt")
  - `stt`: Speech-to-text only (transcribe user audio)
  - `s2s`: Speech-to-speech (transcribe, get AI reply, synthesize reply audio)
- `onTranscript?: (text: string) => void` — Callback when transcript received (STT mode)
- `onReply?: (text: string, audioUrl: string) => void` — Callback when reply received (S2S mode)
- `className?: string` — Additional CSS classes

**Usage in chat toolbar:**

```tsx
// In src/components/ChatWithHistory.tsx (add this import)
import { VoiceRecorder, useVoice } from "@/voice/VoiceRecorder";

// In component:
export function ChatWithHistory() {
  const { mode, toggleMode } = useVoice();

  return (
    <div>
      {/* Existing chat UI */}
      
      {/* Add voice recorder section */}
      <div className="mt-4">
        <button onClick={toggleMode}>
          Mode: {mode === "stt" ? "STT Only" : "Speech-to-Speech"}
        </button>
        <VoiceRecorder 
          mode={mode}
          onTranscript={(text) => {
            // Send transcript to chat
            console.log("User said:", text);
          }}
          onReply={(text, audioUrl) => {
            // Handle AI reply
            console.log("AI said:", text);
          }}
        />
      </div>
    </div>
  );
}
```

### VoiceButton

Compact voice button for placing in chat input toolbar.

**Props:**
- `mode?: "stt" | "s2s"` — Recording mode (default: "stt")
- `onTranscript?: (text: string) => void` — Callback for transcription
- `onReply?: (text: string, audioUrl: string) => void` — Callback for S2S reply
- `onError?: (error: string) => void` — Error callback
- `tooltip?: string` — Button tooltip text
- `size?: "sm" | "default" | "lg"` — Button size

**Usage in chat input:**

```tsx
// In src/components/ChatWithHistory.tsx
import VoiceButton from "@/voice/VoiceButton";

// In your message input area:
<div className="flex gap-2 items-center">
  {/* Existing text input */}
  <input type="text" placeholder="Type message..." />
  
  {/* Add voice button */}
  <VoiceButton
    mode="stt"
    onTranscript={(text) => {
      // Populate text input or send directly
      setMessage(text);
    }}
  />
  
  {/* Send button */}
  <button>Send</button>
</div>
```

## Hooks

### useVoice

State management hook for voice mode toggling.

```tsx
import { useVoice } from "@/voice/VoiceRecorder";

const { mode, setMode, toggleMode, isSpeechToSpeech } = useVoice();
```

Returns:
- `mode: "stt" | "s2s"` — Current mode
- `setMode(mode)` — Set mode directly
- `toggleMode()` — Toggle between modes
- `isSpeechToSpeech: boolean` — Is currently in S2S mode

## Types

```typescript
// API Responses
interface TranscribeResponse {
  text: string;
  source: "openai" | "colab";
}

interface S2SResponse {
  request_text: string;
  reply_text: string;
  audio_url: string;
  duration_ms?: number;
}

// Component State
interface VoiceRecorderState {
  isRecording: boolean;
  isPending: boolean;
  mode: VoiceMode;
  transcript?: string;
  reply?: string;
  audioUrl?: string;
  error?: string;
}
```

## Environment Variables

No frontend-specific env vars needed if calling backend `/api/voice/*` routes.

Optional if calling Colab directly:
- `VITE_VOICE_REMOTE_URL` — Colab service ngrok URL (not recommended, use backend instead)

## API Endpoints

Components call these backend endpoints:

- `POST /api/voice/transcribe` — Transcribe audio file
- `POST /api/voice/s2s` — Full speech-to-speech pipeline

See `app/voice_service/README.md` for backend setup.

## Setup Steps

1. **Backend setup** (required):
   - Set `VOICE_REMOTE_URL` and/or `OPENAI_API_KEY` environment variables
   - Register voice router in `app/main.py`:
     ```python
     from app.voice_service.router import router as voice_router
     app.include_router(voice_router, prefix="/api/voice")
     ```

2. **Frontend setup** (optional, if using components):
   - Import `VoiceButton` or `VoiceRecorder` into your chat components
   - Call handlers to integrate with chat state

3. **Permissions**:
   - Browser will request microphone access on first recording attempt
   - User must grant permission to record

## Troubleshooting

**"microphone access denied"**
- Check browser permissions for localhost/your domain
- Try HTTPS (required for microphone access on production)

**"API error 503"**
- Ensure backend is running and voice service registered
- Check `OPENAI_API_KEY` and `VOICE_REMOTE_URL` are set

**Audio not playing**
- S2S mode requires `VOICE_REMOTE_URL` (Colab TTS service)
- Check browser console for playback errors

**Slow transcription**
- First request may be slow while model loads (~10-30s on Colab)
- Subsequent requests should be ~1-2s for OpenAI STT

## Performance

- **STT (OpenAI Whisper)**: ~1-2s per request
- **S2S full pipeline**: ~10-30s (includes AI inference, TTS synthesis)
- **Browser recording**: Real-time, minimal overhead
- Audio format: WebM (efficient compression)

## Security Notes

- Microphone access requires explicit user permission
- Audio files transmitted to backend/external services
- Authorization header added if user authenticated (Clerk)
- No audio stored in browser cache
