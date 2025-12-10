import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import * as chatController from '../controllers/chat.controller.js';
import * as transcriptionController from '../controllers/transcription.controller.js';
import * as scraperController from '../controllers/scraper.controller.js';
import * as unifiedController from '../controllers/unified.controller.js';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Webhook endpoint (public - no authentication required)
router.post('/webhook/analyze', webhookController.webhookHandler);

// All other API routes require authentication
router.use(authenticate);

// Chat endpoints
router.post('/chat/completions', chatController.chatCompletionHandler);

// Unified transcription endpoint (auto-detects YouTube or Instagram)
router.post('/transcribe', unifiedController.unifiedTranscribeHandler);

// Specific transcription endpoints (legacy support)
router.post('/transcribe/youtube', transcriptionController.transcribeYouTubeHandler);
router.post('/transcribe/audio', upload.single('audio') as any, transcriptionController.transcribeAudioHandler);

// Instagram endpoint
router.post('/extract/instagram', transcriptionController.extractInstagramHandler);

// Web scraping endpoint
router.post('/scrape', scraperController.scrapeWebPageHandler);

export default router;
