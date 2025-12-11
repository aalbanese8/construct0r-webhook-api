#!/usr/bin/env python3
"""
Video Audio Downloader using yt-dlp
Supports YouTube and TikTok URLs.

For YouTube, tries in order:
1. transcriptapi.com (fast, requires API key)
2. youtube-transcript-api (free, auto-generated captions)
3. Download audio + Whisper (fallback)
"""

import sys
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error

try:
    import yt_dlp
except ImportError:
    print(json.dumps({
        "error": "yt-dlp not installed. Run: pip3 install yt-dlp"
    }))
    sys.exit(1)

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        VideoUnavailable
    )
    TRANSCRIPT_API_AVAILABLE = True
except ImportError:
    TRANSCRIPT_API_AVAILABLE = False


def extract_video_id(url):
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def compress_audio_if_needed(audio_path, max_size_mb=10):
    """
    Compress audio file if it exceeds max_size_mb using FFmpeg
    Targets 5-10MB for optimal Whisper API performance

    Args:
        audio_path: Path to the audio file
        max_size_mb: Maximum file size in MB (default 10MB, optimal for Whisper)

    Returns:
        Path to the compressed file (or original if compression not needed)
    """
    file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)

    if file_size_mb <= max_size_mb:
        # File is already small enough
        return audio_path

    # File is too large, compress it with lower bitrate
    compressed_path = audio_path.replace('.mp3', '_compressed.mp3')

    # Use progressively lower bitrates until file is small enough
    # Speech remains perfectly intelligible even at 24kbps
    for bitrate in ['48k', '32k', '24k']:
        try:
            # Compress using FFmpeg
            subprocess.run([
                'ffmpeg', '-i', audio_path,
                '-b:a', bitrate,
                '-ar', '16000',  # Lower sample rate for speech
                '-ac', '1',       # Mono audio
                '-y',             # Overwrite output file
                compressed_path
            ], check=True, capture_output=True)

            # Check if compressed file is small enough
            compressed_size_mb = os.path.getsize(compressed_path) / (1024 * 1024)
            if compressed_size_mb <= max_size_mb:
                # Replace original with compressed version
                os.remove(audio_path)
                os.rename(compressed_path, audio_path)
                return audio_path

        except subprocess.CalledProcessError:
            continue

    # If we get here, even maximum compression didn't work
    # Return the most compressed version we have
    if os.path.exists(compressed_path):
        os.remove(audio_path)
        os.rename(compressed_path, audio_path)

    return audio_path


def get_transcriptapi_transcript(video_url):
    """
    Try to get transcript from transcriptapi.com API

    Returns:
        tuple: (success: bool, title: str, transcript: str)
    """
    api_key = os.environ.get('TRANSCRIPTAPI_KEY')
    if not api_key:
        print("TranscriptAPI key not found, skipping...", file=sys.stderr)
        return False, None, None

    print(f"Trying TranscriptAPI for video: {video_url}", file=sys.stderr)

    try:
        video_id = extract_video_id(video_url)
        if not video_id:
            return False, None, None

        # Make API request
        url = f"https://transcriptapi.com/api/v2/youtube/transcript?video_url={video_id}&format=json"
        request = urllib.request.Request(
            url,
            headers={'Authorization': f'Bearer {api_key}'}
        )

        with urllib.request.urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode())

        # Extract transcript text from segments
        if 'transcript' in data:
            # transcript is an array of {start, text} objects
            if isinstance(data['transcript'], list):
                transcript = ' '.join([segment['text'] for segment in data['transcript']])
            else:
                # If it's already a string (text format)
                transcript = data['transcript']
        else:
            return False, None, None

        # Get video title from metadata if available
        title = data.get('metadata', {}).get('title', None) or data.get('title', 'Unknown Title')

        # If title not in API response, get it from yt-dlp
        if title == 'Unknown Title':
            with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
                info = ydl.extract_info(video_url, download=False)
                title = info.get('title', 'Unknown Title')

        return True, title, transcript

    except urllib.error.HTTPError as e:
        # Log HTTP errors for debugging
        error_body = e.read().decode() if hasattr(e, 'read') else str(e)
        print(f"TranscriptAPI HTTP Error {e.code}: {error_body}", file=sys.stderr)
        return False, None, None
    except (urllib.error.URLError, json.JSONDecodeError, KeyError) as e:
        # API error, fall back to next method
        print(f"TranscriptAPI Error: {type(e).__name__}: {e}", file=sys.stderr)
        return False, None, None
    except Exception as e:
        # Any other error, fall back
        print(f"TranscriptAPI Unexpected Error: {e}", file=sys.stderr)
        return False, None, None


def get_auto_transcript(video_url):
    """
    Try to get auto-generated transcript from YouTube using youtube-transcript-api

    Returns:
        tuple: (success: bool, title: str, transcript: str)
    """
    if not TRANSCRIPT_API_AVAILABLE:
        return False, None, None

    try:
        video_id = extract_video_id(video_url)
        if not video_id:
            return False, None, None

        # Get transcript (prefers manual, falls back to auto-generated)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)

        # Combine all transcript segments
        transcript = ' '.join([segment['text'] for segment in transcript_list])

        # Get video title using yt-dlp
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            title = info.get('title', 'Unknown Title')

        return True, title, transcript

    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable):
        # No transcript available, will fall back to audio download
        return False, None, None
    except Exception as e:
        # Any other error, fall back to audio download
        return False, None, None


def download_youtube_audio(video_url, output_dir):
    """
    Download audio from YouTube or TikTok video
    First tries to get auto-generated transcript (YouTube only - fast & free),
    then falls back to downloading audio for Whisper transcription.

    Args:
        video_url: YouTube or TikTok video URL
        output_dir: Directory to save downloaded audio

    Returns:
        Dictionary with title and transcript/audio path
    """
    try:
        # STEP 1: Try transcriptapi.com first (YouTube only, requires API key)
        # TikTok doesn't support transcript APIs, so skip for TikTok URLs
        is_tiktok = 'tiktok.com' in video_url.lower()

        if not is_tiktok:
            # Try transcriptapi.com first
            success, title, transcript = get_transcriptapi_transcript(video_url)

            if success:
                # transcriptapi.com success! Return immediately
                result = {
                    "title": title,
                    "transcript": transcript,
                    "audio_path": None,
                    "source": "transcriptapi",
                    "url": video_url,
                }
                print(json.dumps(result))
                return 0

            # STEP 2: Fall back to youtube-transcript-api (free, auto-generated captions)
            success, title, transcript = get_auto_transcript(video_url)

            if success:
                # Auto-transcript found! Return immediately without downloading
                result = {
                    "title": title,
                    "transcript": transcript,
                    "audio_path": None,
                    "source": "youtube_transcript_api",
                    "url": video_url,
                }
                print(json.dumps(result))
                return 0
        else:
            # TikTok doesn't support transcript APIs
            success, title, transcript = False, None, None

        # STEP 3: No transcript APIs available (or TikTok), download audio for Whisper
        # Configure yt-dlp options (low quality optimized for speech transcription)
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '64',  # Low bitrate optimized for speech (perfectly audible)
            }],
            'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'noprogress': True,
            'no_color': True,
        }

        # Download video info and audio
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)

            video_id = info['id']
            title = info['title']

            # The audio file path after conversion
            audio_path = os.path.join(output_dir, f"{video_id}.mp3")

            # STEP 3: Compress audio if over 10MB (target 5-10MB for optimal Whisper performance)
            audio_path = compress_audio_if_needed(audio_path, max_size_mb=10)

            result = {
                "title": title,
                "audio_path": audio_path,
                "transcript": None,  # Will be transcribed by Whisper
                "source": "whisper",
                "duration": info.get('duration', 0),
                "url": video_url,
            }

            print(json.dumps(result))
            return 0

    except Exception as e:
        error_result = {
            "error": f"Failed to download YouTube audio: {str(e)}"
        }
        print(json.dumps(error_result))
        return 1


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({
            "error": "Usage: python3 youtube_downloader.py <video_url> <output_dir>"
        }))
        sys.exit(1)

    video_url = sys.argv[1]
    output_dir = sys.argv[2]

    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    sys.exit(download_youtube_audio(video_url, output_dir))
