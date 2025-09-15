import {GoogleGenAI} from '@google/genai';

// Google AI API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Initialize default API key for testing (remove in production)
// const DEFAULT_API_KEY = 'add your default API key here for testing';
// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Check if API key is already set
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (!result.geminiApiKey) {
      // Set the default API key for testing
      // await chrome.storage.sync.set({ geminiApiKey: DEFAULT_API_KEY });
      // console.log('Default API key initialized for testing');
    }
  } catch (error) {
    console.error('Error initializing API key:', error);
  }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'askAI') {
    handleAIRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'askAIStream') {
    handleAIRequestStream(request, sender);
    return true; // Keep message channel open for streaming
  }
});

async function handleAIRequest(request, sendResponse) {
  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;

    if (!apiKey) {
      sendResponse({ error: 'API key not configured. Please set your Google AI API key in settings.' });
      return;
    }

    // Get webpage content
    const webpageContent = await getWebpageContent();

    // Prepare the AI prompt
    const prompt = buildAIPrompt(request.message, webpageContent, request.history);

    // Make API call to Gemini
    const aiResponse = await callGeminiAPI(apiKey, prompt);

    sendResponse({ reply: aiResponse });

  } catch (error) {
    console.error('AI request error:', error);
    sendResponse({ error: error.message || 'An error occurred while processing your request.' });
  }
}

async function handleAIRequestStream(request, sender) {
  // Get the active tab ID (since sender.tab might be undefined for side panel)
  let tabId = sender.tab?.id;

  if (!tabId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tabs[0]?.id;
    } catch (tabError) {
      console.error('Could not find active tab:', tabError);
    }
  }

  if (!tabId) {
    console.error('No tab ID available for streaming response');
    return;
  }

  try {
    // Get API key from storage
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    const apiKey = result.geminiApiKey;

    if (!apiKey) {
      chrome.runtime.sendMessage({
        action: 'streamError',
        error: 'API key not configured. Please set your Google AI API key in settings.'
      });
      return;
    }

    // Get webpage content
    const webpageContent = await getWebpageContent();

    // Prepare the AI prompt
    const prompt = buildAIPrompt(request.message, webpageContent, request.history);

    // Make streaming API call to Gemini
    await callGeminiAPIStream(apiKey, prompt, tabId);

  } catch (error) {
    console.error('AI streaming request error:', error);
    try {
      chrome.runtime.sendMessage({
        action: 'streamError',
        error: error.message || 'An error occurred while processing your request.'
      });
    } catch (msgError) {
      console.error('Failed to send error message:', msgError);
    }
  }
}

async function getWebpageContent() {
  try {
    // Get the active tab                               
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tabs[0] || !tabs[0].url || (!tabs[0].url.startsWith('http://') && !tabs[0].url.startsWith('https://'))) {
      return 'No active webpage found.';
    }

    // Extract content from the webpage
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: extractPageContent
    });

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    return results[0].result || 'Unable to extract webpage content.';

  } catch (error) {
    console.error('Error extracting webpage content:', error);
    return 'Error extracting webpage content: ' + error.message;
  }
}

function extractPageContent() {
  // Extract main content from the page
  const title = document.title || '';
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';

  // Get text content from main content areas
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '#content',
    '#main'
  ];

  let mainContent = '';
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element.textContent.trim();
      break;
    }
  }

  // Fallback to body content if no main content found
  if (!mainContent) {
    mainContent = document.body.textContent.trim();
  }

  // Clean up the content (remove excessive whitespace)
  mainContent = mainContent.replace(/\s+/g, ' ').substring(0, 8000); // Limit to 8000 chars

  return {
    title: title,
    description: metaDescription,
    content: mainContent,
    url: window.location.href
  };
}

function buildAIPrompt(userMessage, webpageContent, history = []) {
  const systemPrompt = `You are an AI assistant helping a user understand and interact with a webpage. You have access to the webpage's content, title, and metadata.

Webpage Information:
- Title: ${webpageContent.title}
- Description: ${webpageContent.description}
- URL: ${webpageContent.url}
- Content: ${webpageContent.content}

Instructions:
1. Be helpful and provide accurate information based on the webpage content
2. If the user asks about something not in the webpage, politely explain that
3. Keep responses concise but informative
4. Use the conversation history to maintain context
5. If appropriate, suggest related actions or questions

Previous conversation:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User's current question: ${userMessage}

Please provide a helpful response:`;

  return systemPrompt;
}

async function callGeminiAPI(apiKey, prompt) {
  const ai = new GoogleGenAI({apiKey: apiKey});

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    // Extract text from the Gemini API response
    let text = '';
    if (result && result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text;
      }
    }

    if (!text) {
      throw new Error('No text content found in Gemini API response');
    }

    return text;

  } catch (error) {
    console.error('Gemini API call failed:', error);

    // Handle specific error types
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('INVALID_ARGUMENT')) {
      throw new Error('Invalid API key. Please check your Google AI API key in settings.');
    } else if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('RATE_LIMIT')) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please check your Google AI Studio account.');
    }

    throw error;
  }
}

async function callGeminiAPIStream(apiKey, prompt, tabId) {
  const ai = new GoogleGenAI({apiKey: apiKey});

  try {
    const streamingResponse = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp',
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    let fullText = '';
    let chunkCount = 0;

    // Process the streaming response
    for await (const chunk of streamingResponse) {
      if (chunk && chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const newText = candidate.content.parts[0].text;

          if (newText) {
            fullText += newText;
            chunkCount++;

            // Send chunk to frontend (using runtime messaging for side panel)
            try {
              chrome.runtime.sendMessage({
                action: 'streamChunk',
                chunk: newText,
                fullText: fullText,
                isComplete: false
              });
            } catch (msgError) {
              console.error('Failed to send chunk:', msgError);
              // Don't throw here - continue with next chunk
            }
          }
        }
      }
    }

    // Send completion message
    try {
      chrome.runtime.sendMessage({
        action: 'streamComplete',
        fullText: fullText,
        chunkCount: chunkCount
      });
    } catch (msgError) {
      console.error('Failed to send completion:', msgError);
    }

  } catch (error) {
    console.error('Gemini streaming API call failed:', error);

    // Handle specific error types
    let errorMessage = 'An error occurred while streaming the response.';
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('INVALID_ARGUMENT')) {
      errorMessage = 'Invalid API key. Please check your Google AI API key in settings.';
    } else if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('RATE_LIMIT')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      errorMessage = 'API quota exceeded. Please check your Google AI Studio account.';
    }

    // Send error to frontend
    try {
      chrome.runtime.sendMessage({
        action: 'streamError',
        error: errorMessage
      });
    } catch (msgError) {
      console.error('Failed to send error:', msgError);
    }

    throw error;
  }
}