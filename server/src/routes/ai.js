import express from 'express';
import { streamAIResponse, healthCheck } from '../controllers/aiController.js';

const router = express.Router();

/**
 * POST /api/ai/stream
 * Stream AI response for chat messages
 * Body: { message, webpageContent, history, apiKey }
 */
router.post('/stream', streamAIResponse);

/**
 * GET /api/ai/health
 * Health check for AI service
 */
router.get('/health', healthCheck);

export default router;
