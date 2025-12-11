import { Request, Response } from 'express';
import { transcribeYouTubeVideo } from '../services/transcription.service.js';
import { extractInstagramContent } from '../services/instagram.service.js';
import { analyzeForLANDR } from '../services/landr-analysis.service.js';

interface WebhookRequest {
  url: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
}

interface WebhookResponse {
  success: boolean;
  data?: {
    platform: string;
    url: string;
    title: string;
    transcript: string;
    duration?: number;
    analysis: {
      hookStrategy: string;
      engagementTactics: string[];
      contentStructure: string;
      adaptationSuggestions: string;
      contentIdeas: string[];
    };
  };
  error?: string;
}

export const webhookHandler = async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('[Webhook] Processing started:', new Date().toISOString());

  try {
    const { url, platform } = req.body as WebhookRequest;

    // Validation
    if (!url || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: url and platform',
      } as WebhookResponse);
    }

    if (!['youtube', 'instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be: youtube, instagram, or tiktok',
      } as WebhookResponse);
    }

    console.log(`[Webhook] Processing ${platform} video: ${url}`);

    let title: string;
    let transcript: string;
    let duration: number | undefined;

    // Step 1: Download and transcribe based on platform
    if (platform === 'youtube' || platform === 'tiktok') {
      // Tries: TranscriptAPI.com → YouTube Transcript API → yt-dlp download
      console.log(`[Webhook] Transcribing ${platform} video (trying transcript APIs first)...`);
      const result = await transcribeYouTubeVideo(url);
      title = result.title;
      transcript = result.transcript;

      console.log(`[Webhook] Transcription complete. Title: ${title}`);
    } else if (platform === 'instagram') {
      console.log('[Webhook] Extracting Instagram content...');
      const result = await extractInstagramContent(url);

      // Combine caption and transcript for Instagram
      title = result.caption?.substring(0, 100) || 'Instagram Post';
      transcript = result.hasVideo && result.transcript
        ? `${result.caption}\n\n[Video Transcript]\n${result.transcript}`
        : result.caption || '[No caption available]';

      console.log(`[Webhook] Instagram extraction complete. Has video: ${result.hasVideo}`);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Step 2: Send to OpenAI for LANDR analysis
    console.log('[Webhook] Generating LANDR analysis...');
    const analysis = await analyzeForLANDR({
      platform,
      title,
      transcript,
      url,
      duration,
    });

    const processingTime = Date.now() - startTime;
    console.log(`[Webhook] Complete! Processing time: ${processingTime}ms`);

    // Step 3: Return JSON response
    return res.json({
      success: true,
      data: {
        platform,
        url,
        title,
        transcript,
        duration,
        analysis,
      },
    } as WebhookResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Webhook] Error after ${processingTime}ms:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return res.status(500).json({
      success: false,
      error: errorMessage,
    } as WebhookResponse);
  }
};
