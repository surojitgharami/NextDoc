# Voice Service Module

This module provides speech-to-text (STT) and speech-to-speech (S2S) pipeline endpoints for the AI Doctor backend.

## Endpoints

### POST `/api/voice/transcribe`
Transcribe audio file to text.

**Request:** multipart/form-data with `file` field
**Response:** `{ text: string, source: "openai" | "colab" }`

### POST `/api/voice/synthesize`
Synthesize text to speech audio.

**Request:** `{ text: string, voice_options?: object, language?: string }`
**Response:** `{ audio_url: string, duration_ms?: number, format: string }`

### POST `/api/voice/s2s`
Full speech-to-speech pipeline (STT → AI Reply → TTS).

**Request:** multipart/form-data with `file` field
**Response:** `{ request_text: string, reply_text: string, audio_url: string, duration_ms?: number }`

## Environment Variables

### Required (choose at least one)
- `VOICE_REMOTE_URL` — Public URL to Colab Whisper/Coqui service (e.g., ngrok URL)
- `OPENAI_API_KEY` — OpenAI API key for STT (fallback if VOICE_REMOTE_URL unavailable)

### Optional
- `COQUI_REMOTE_URL` — If Coqui TTS runs on separate host (not required if under VOICE_REMOTE_URL)
- `AI_REPLY_URL` — URL to AI chat endpoint (default: `http://localhost:8000/api/v1/chat/message`)
- `AI_AUTH_TOKEN` — Optional auth token for AI endpoint

## Registration

To enable this module in your FastAPI app:

1. Open `app/main.py`
2. Add these imports after other router imports:
   ```python
   from app.voice_service.router import router as voice_router
   ```
3. Add this registration before `if __name__ == "__main__"`:
   ```python
   app.include_router(voice_router, prefix="/api/voice")
   ```

**Example (partial):**
```python
# app/main.py
from app.voice_service.router import router as voice_router

# ... other routers ...

app.include_router(voice_router, prefix="/api/voice")
```

## Setup Instructions

### Option A: Use Google Colab Service

1. Run `colab/whisper_coqui_service.ipynb` in Google Colab
2. Copy the public ngrok URL (e.g., `https://abc123.ngrok.io`)
3. Set environment variable:
   ```bash
   export VOICE_REMOTE_URL="https://abc123.ngrok.io"
   ```
4. Backend will automatically use the remote service

### Option B: Use OpenAI Whisper (STT only)

1. Get your OpenAI API key
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```
3. S2S mode unavailable (no TTS without Colab service)

### Option C: Hybrid (OpenAI STT + Remote TTS)

Combine `OPENAI_API_KEY` and `VOICE_REMOTE_URL` for maximum flexibility.

## Testing

### Using curl

**Transcribe:**
```bash
curl -X POST http://localhost:8000/api/voice/transcribe \
  -F "file=@audio.webm"
```

**Synthesize:**
```bash
curl -X POST http://localhost:8000/api/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "en"}'
```

**S2S:**
```bash
curl -X POST http://localhost:8000/api/voice/s2s \
  -F "file=@audio.webm"
```

### Using Postman

Import `postman_voice_collection.json` for pre-configured requests.

## Troubleshooting

**"No STT provider configured"**
- Set either `VOICE_REMOTE_URL` or `OPENAI_API_KEY`

**"No TTS provider configured"**
- S2S requires `VOICE_REMOTE_URL` (Colab service)
- Synthesize endpoint also requires remote Coqui service

**Remote service timeout**
- Ensure ngrok tunnel is active
- Increase timeout in `client.py` if needed (currently 60s)
- Check network connectivity

**OpenAI API errors**
- Verify `OPENAI_API_KEY` is valid and has credit
- Check API key has Audio model access

## Performance Notes

- **Colab service:** First request warm-up ~10-30s, subsequent ~2-5s per request
- **OpenAI STT:** ~1-2s per request
- **Coqui TTS:** ~5-15s per request (depends on text length)
- Recommend caching responses if same text synthesized multiple times
