# Quick Start Guide - Webhook API

Your app has been converted to a webhook API! Here's how to get started:

## ⚡ Local Testing (5 minutes)

1. **Set your API keys:**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - OPENAI_API_KEY (required)
   # - TRANSCRIPTAPI_KEY (optional, for faster YouTube transcripts)
   ```

2. **Install dependencies:**
   ```bash
   npm install
   pip3 install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   npm run build
   npm start
   ```

4. **Test the webhook** (in another terminal):
   ```bash
   ./test-webhook.sh youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
   ```

## 🚀 Deploy to Render (10 minutes)

1. **Create a new Web Service** on [Render](https://render.com)

2. **Connect your GitHub repo**

3. **Render will auto-detect `render.yaml`** ✅

4. **Add environment variables** in Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key (required)
   - `TRANSCRIPTAPI_KEY`: Your TranscriptAPI.com key (optional, for faster YouTube transcripts)

5. **Deploy!** Render will:
   - Install Python dependencies from `requirements.txt`
   - Install Node dependencies
   - Build TypeScript
   - Start the server

6. **Test your deployment:**
   ```bash
   curl -X POST https://your-app.onrender.com/api/webhook/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "platform": "youtube"
     }'
   ```

## 📡 API Usage

### Endpoint
```
POST /api/webhook/analyze
```

### Request
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "platform": "youtube"
}
```

**Platform options:** `"youtube"`, `"instagram"`, `"tiktok"`

### Response
```json
{
  "success": true,
  "data": {
    "platform": "youtube",
    "title": "Video Title",
    "transcript": "Full transcript...",
    "analysis": {
      "hookStrategy": "Analysis of opening hook...",
      "engagementTactics": ["Tactic 1", "Tactic 2", ...],
      "contentStructure": "Video structure breakdown...",
      "adaptationSuggestions": "How to adapt for LANDR...",
      "contentIdeas": [
        "Idea 1: Title - Hook - Takeaway",
        "Idea 2: Title - Hook - Takeaway",
        "Idea 3: Title - Hook - Takeaway"
      ]
    }
  }
}
```

## 📚 Documentation

- **`WEBHOOK_API_README.md`** - Complete API docs, deployment, troubleshooting
- **`CHANGES_SUMMARY.md`** - All changes made during conversion
- **`test-webhook.sh`** - Test script with examples

## 🗑️ Optional Cleanup

These files are only needed for the Electron desktop app and can be deleted:

```bash
rm -rf electron/ renderer/ build/ assets/ dist-scripts/
rm afterSign.cjs build-and-sign.sh build_standalone.sh electron-builder.json
rm ELECTRON_*.md EASY_BUILD.md DISTRIBUTION.md
```

## 💰 Cost Per Video

- **YouTube (with auto-transcript):** ~$0.001
- **TikTok/Instagram (with Whisper):** ~$0.007
- **1000 videos/month:** ~$1-7 depending on platform mix

## ✅ What's Included

✅ **YouTube support** - 3-tier transcription (TranscriptAPI.com → auto-captions → Whisper)
✅ **Instagram support** - Caption + video transcription
✅ **TikTok support** - Full video transcription
✅ **LANDR analysis** - Hook, engagement, structure, ideas
✅ **In-memory processing** - No file persistence
✅ **Render-ready** - Deploy in minutes
✅ **Cost-optimized** - Uses GPT-4o-mini
✅ **Error handling** - Comprehensive logging
✅ **Smart fallbacks** - Graceful degradation if APIs fail

## 🆘 Need Help?

1. Check `WEBHOOK_API_README.md` for detailed docs
2. Review `CHANGES_SUMMARY.md` to see what changed
3. Check logs: `npm start` (local) or Render dashboard (production)

## 🎉 You're Ready!

Start analyzing videos with LANDR-specific insights. The API is public (no auth), so you can integrate it into any workflow.

**Example use cases:**
- Slack bot that analyzes competitor videos
- Chrome extension for instant analysis
- Zapier integration for automated content research
- Internal tool for content team

Happy analyzing! 🚀
