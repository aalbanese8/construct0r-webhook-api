# Construct0r Webhook API

A webhook API that downloads and analyzes videos from YouTube, Instagram, and TikTok, providing LANDR-specific content analysis.

## Features

- **Multi-platform support**: YouTube, Instagram, and TikTok
- **Smart transcription**: Uses YouTube auto-transcripts when available, falls back to Whisper API
- **LANDR-specific analysis**: Analyzes videos for:
  - Hook strategy (first 3 seconds)
  - Engagement tactics
  - Content structure
  - Adaptation suggestions for LANDR's brand voice
  - 3 specific content ideas based on the video
- **In-memory processing**: No local file persistence (temp files auto-deleted)
- **Render-ready**: Configured for easy deployment

## API Endpoint

### POST `/api/webhook/analyze`

Analyzes a video and returns LANDR-specific content insights.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "platform": "youtube"
}
```

**Parameters:**
- `url` (string, required): Video URL
- `platform` (string, required): One of: `"youtube"`, `"instagram"`, or `"tiktok"`

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "youtube",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Video Title",
    "transcript": "Full transcript text...",
    "duration": 180,
    "analysis": {
      "hookStrategy": "Detailed analysis of the opening hook...",
      "engagementTactics": [
        "Tactic 1: Uses pattern interrupts",
        "Tactic 2: Storytelling arc",
        "Tactic 3: Visual demonstrations"
      ],
      "contentStructure": "Breakdown of video organization...",
      "adaptationSuggestions": "How to adapt for LANDR...",
      "contentIdeas": [
        "Idea 1: Mixing Secrets - Hook: Show before/after - Takeaway: EQ techniques",
        "Idea 2: Mastering Myths - Hook: Debunk common belief - Takeaway: Proper loudness",
        "Idea 3: Production Flow - Hook: Speed challenge - Takeaway: LANDR tools"
      ]
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Setup & Deployment

### Local Development

1. **Install dependencies:**
```bash
npm install
pip3 install -r requirements.txt
```

2. **Set environment variables:**
```bash
export OPENAI_API_KEY="sk-..."
export PORT=3001
export NODE_ENV=development
```

3. **Build and run:**
```bash
npm run build
node dist/src/index.js
```

### Render Deployment

1. **Create a new Web Service** on Render

2. **Set environment variables** in Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render default)
   - `FRONTEND_URL`: `*` (allow all origins)

3. **Deploy:**
   - Render will automatically use `render.yaml` configuration
   - Build command: `npm ci && pip3 install -r requirements.txt && npm run build`
   - Start command: `node dist/src/index.js`

4. **Test deployment:**
```bash
curl -X POST https://your-app.onrender.com/api/webhook/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "platform": "youtube"
  }'
```

## Technical Details

### Architecture

```
POST /api/webhook/analyze
  ↓
Webhook Controller (webhook.controller.ts)
  ↓
Platform Detection
  ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   YouTube       │   TikTok        │   Instagram     │
│   (yt-dlp)      │   (yt-dlp)      │  (instaloader)  │
└─────────────────┴─────────────────┴─────────────────┘
  ↓
Transcription Service (3-tier fallback)
  ├── TranscriptAPI.com (fastest, optional)
  ├── YouTube Transcript API (fast, free)
  └── Whisper API (slowest, most reliable)
  ↓
LANDR Analysis Service (GPT-4o-mini)
  ↓
JSON Response
```

### Processing Flow

1. **Download**: Uses yt-dlp (YouTube/TikTok) or instaloader (Instagram)
2. **Transcribe** (YouTube 3-tier fallback):
   - **Tier 1**: TranscriptAPI.com (fastest, if API key provided)
   - **Tier 2**: YouTube Transcript API (free, auto-captions)
   - **Tier 3**: Download audio + Whisper (slowest, most reliable)
   - TikTok/Instagram: Download audio + Whisper API
3. **Analyze**: Sends transcript to GPT-4o-mini with LANDR-specific prompts
4. **Cleanup**: Automatically deletes temp files
5. **Return**: JSON response with analysis

### Performance Optimizations

- **3-tier transcription fallback**: TranscriptAPI.com → YouTube Transcript API → Whisper
- **TranscriptAPI.com**: Fastest option (if API key provided), sub-second response
- **YouTube auto-transcripts**: Free and fast, skips download/transcription entirely
- **Audio compression**: Compresses audio files >10MB to optimize Whisper API calls
- **Low bitrate**: Uses 64kbps MP3 (sufficient for speech recognition)
- **In-memory processing**: Minimal disk I/O
- **Cost-optimized**: Uses `gpt-4o-mini` ($0.15/1M tokens)

## Files Not Needed for Webhook API

The following files/directories are only needed for the Electron desktop app and can be removed if you only need the webhook API:

- `electron/` - Electron main process
- `renderer/` - React frontend
- `build/` - Electron build resources
- `dist-scripts/` - Electron distribution scripts
- `afterSign.cjs` - Electron signing
- `build-and-sign.sh` - Electron build script
- `build_standalone.sh` - Standalone build script
- `electron-builder.json` - Electron builder config
- `assets/` - Electron assets
- `ELECTRON_*.md` - Electron documentation files

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for Whisper and GPT |
| `TRANSCRIPTAPI_KEY` | No | TranscriptAPI.com key for faster YouTube transcripts |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `FRONTEND_URL` | No | CORS origin (use `*` for webhook mode) |

## Cost Estimation

**Per video analysis:**
- YouTube with TranscriptAPI.com: $0.001-0.003 (TranscriptAPI fee + GPT-4o-mini)
- YouTube with auto-transcript: $0.001 (GPT-4o-mini only, FREE transcription)
- YouTube with Whisper fallback: $0.007 (Whisper + GPT-4o-mini)
- TikTok/Instagram with Whisper: $0.007 (Whisper + GPT-4o-mini)

**Example: 1000 videos/month:**
- All YouTube (auto-transcript): ~$1/month
- All YouTube (TranscriptAPI.com): ~$1-3/month (faster)
- All TikTok/Instagram: ~$7/month
- Mixed (50/50): ~$4/month

**TranscriptAPI.com pricing:** Check [transcriptapi.com/pricing](https://transcriptapi.com) for current rates

## Troubleshooting

### Whisper API errors
- Ensure audio files are <25MB (auto-compressed if needed)
- Check OPENAI_API_KEY is valid

### yt-dlp errors
- Update yt-dlp: `pip install --upgrade yt-dlp`
- Some videos may be region-locked or private

### Instagram errors
- Instagram may require login for some posts
- Rate limiting may occur with many requests

## Support

For issues or questions, check the logs:
```bash
# Local
node dist/src/index.js

# Render
View logs in Render dashboard
```
