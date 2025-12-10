import { openai } from './openai.service.js';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const transcribeAudioFile = async (filePath: string): Promise<string> => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    throw new Error(`Whisper API error: ${error}`);
  }
};

export const transcribeYouTubeVideo = async (videoUrl: string): Promise<{ title: string; transcript: string }> => {
  let tempDir: string | null = null;

  try {
    // Validate YouTube or TikTok URL format
    const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isTikTok = videoUrl.includes('tiktok.com');

    if (!isYoutube && !isTikTok) {
      throw new Error('Invalid URL. Must be a YouTube or TikTok URL');
    }

    // Create temporary directory for downloads
    // Go up to project root (2 levels from dist/services/) then into uploads/
    const platform = isTikTok ? 'tiktok' : 'youtube';
    tempDir = path.join(__dirname, '..', '..', 'uploads', `${platform}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Call Python script to download YouTube audio
    // Scripts are in dist/scripts/ (one level up from dist/services/)
    const scriptPath = path.join(__dirname, '..', 'scripts', 'youtube_downloader.py');
    const command = `python3 "${scriptPath}" "${videoUrl}" "${tempDir}" 2>/dev/null`;

    const { stdout } = await execAsync(command, {
      timeout: 300000, // 5 minute timeout (for long videos + compression)
    });

    // Parse the output from Python script (only the last line should be JSON)
    const lines = stdout.trim().split('\n');
    const jsonOutput = lines[lines.length - 1];
    const output = JSON.parse(jsonOutput);

    if (output.error) {
      throw new Error(output.error);
    }

    // Check if transcript was already obtained from transcript APIs
    let transcript: string;
    if (output.transcript) {
      // Transcript was obtained from API (transcriptapi.com or youtube-transcript-api)
      const source = output.source === 'transcriptapi' ? 'TranscriptAPI.com' : 'YouTube auto-captions';
      console.log(`✅ Using ${source} for: ${output.title}`);
      transcript = output.transcript;
    } else if (output.audio_path) {
      // No transcript API available, transcribe the downloaded audio file with Whisper
      console.log(`🎙️ Transcribing with Whisper API for: ${output.title}`);
      transcript = await transcribeAudioFile(output.audio_path);
    } else {
      throw new Error('No transcript or audio path returned from YouTube downloader');
    }

    // Clean up temporary directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
        console.error('Failed to clean up temp directory:', err);
      });
    }

    return {
      title: output.title,
      transcript,
    };
  } catch (error) {
    // Clean up on error
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
        // Ignore cleanup errors
      });
    }

    console.error('YouTube transcription error:', error);
    throw new Error(`Failed to transcribe YouTube video: ${error}`);
  }
};
