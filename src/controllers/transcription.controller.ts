import { Request, Response } from 'express';
import * as transcriptionService from '../services/transcription.service.js';
import * as instagramService from '../services/instagram.service.js';

export const transcribeYouTubeHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    const result = await transcriptionService.transcribeYouTubeVideo(url);
    return res.json({
      title: result.title,
      text: result.transcript,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'YouTube transcription failed' });
  }
};

export const transcribeAudioHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const transcript = await transcriptionService.transcribeAudioFile(req.file.path);
    return res.json({ text: transcript });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Audio transcription failed' });
  }
};

export const extractInstagramHandler = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Instagram URL is required' });
    }

    const result = await instagramService.extractInstagramContent(url);

    // Combine caption and transcript into "text" field
    const text = result.hasVideo && result.transcript
      ? `${result.caption}\n\n[Video Transcript]\n${result.transcript}`
      : result.caption;

    return res.json({
      ...result,
      text: text,
      title: result.caption?.substring(0, 100) || 'Instagram Post',
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Instagram extraction failed' });
  }
};
