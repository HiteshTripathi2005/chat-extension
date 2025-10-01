import { google } from '@ai-sdk/google';
import { stepCountIs, streamText } from 'ai';
import { buildAIPrompt } from '../../../client/src/utils/prompt.js';
import { timeTool } from '../tools/time-tool.js';

// Google AI API configuration
const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Stream AI response for chat
 * Handles streaming responses from Google Gemini API
 */
export async function streamAIResponse(req, res) {
  try {
    const { message, webpageContent, history, apiKey } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    if (!webpageContent) {
      return res.status(400).json({ error: 'Webpage content is required' });
    }

    // Set API key for Vercel AI SDK
    if (typeof globalThis !== 'undefined') {
      globalThis.process = globalThis.process || {};
      globalThis.process.env = globalThis.process.env || {};
      globalThis.process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    // Build AI prompt
    const messages = buildAIPrompt(message, webpageContent, history || []);

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Call Gemini API with streaming
    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: messages,
      temperature: 0.7,
      tools: {timeTool},
      stopWhen: stepCountIs(5),
      onFinish: () => {
        console.log('Streaming complete');
      }
    });

    // Use Vercel AI SDK's pipeUIMessageStreamToResponse method for clean streaming
    result.pipeUIMessageStreamToResponse(res);

  } catch (error) {
    console.error('AI streaming error:', error);

    // Handle specific error types
    let errorMessage = 'An error occurred while streaming the response.';
    let statusCode = 500;

    if (error.message.includes('API_KEY_INVALID') || 
        error.message.includes('INVALID_ARGUMENT') || 
        error.message.includes('API key is missing')) {
      errorMessage = 'Invalid API key. Please check your Google AI API key in settings.';
      statusCode = 401;
    } else if (error.message.includes('RESOURCE_EXHAUSTED') || 
               error.message.includes('RATE_LIMIT')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      statusCode = 429;
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'API quota exceeded. Please check your Google AI Studio account.';
      statusCode = 429;
    }

    // Send error as SSE if headers not sent, otherwise as JSON
    if (!res.headersSent) {
      res.status(statusCode).json({ error: errorMessage });
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: errorMessage 
      })}\n\n`);
      res.end();
    }
  }
}

/**
 * Health check for AI service
 */
export function healthCheck(req, res) {
  res.json({ 
    status: 'ok', 
    service: 'ai',
    model: GEMINI_MODEL,
    timestamp: new Date().toISOString()
  });
}
