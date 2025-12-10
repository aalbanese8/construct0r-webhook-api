import { Request, Response } from 'express';
import * as transcriptionService from '../services/transcription.service.js';
import * as instagramService from '../services/instagram.service.js';

/**
 * Unified transcribe endpoint that handles YouTube, TikTok, and Instagram URLs
 */
export const unifiedTranscribeHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Detect platform from URL
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const isInstagram = url.includes('instagram.com');
    const isTikTok = url.includes('tiktok.com');

    if (isYouTube || isTikTok) {
      // Handle YouTube and TikTok (both use yt-dlp)
      const result = await transcriptionService.transcribeYouTubeVideo(url);
      return res.json({
        platform: isTikTok ? 'tiktok' : 'youtube',
        title: result.title,
        text: result.transcript,
        url: url,
      });
    } else if (isInstagram) {
      // Handle Instagram
      const result = await instagramService.extractInstagramContent(url);

      // Combine caption and transcript into "text" field
      const text = result.hasVideo && result.transcript
        ? `${result.caption}\n\n[Video Transcript]\n${result.transcript}`
        : result.caption;

      return res.json({
        platform: 'instagram',
        text: text,
        title: result.caption?.substring(0, 100) || 'Instagram Post',
        hasVideo: result.hasVideo,
        type: result.type,
        url: url,
      });
    } else {
      return res.status(400).json({
        error: 'Unsupported platform. Please provide a YouTube, TikTok, or Instagram URL.',
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Transcription failed' });
  }
};
