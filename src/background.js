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
      await chrome.storage.sync.set({ geminiApiKey: DEFAULT_API_KEY });
      console.log('Default API key initialized for testing');
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
  const requestBody = {
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
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Gemini API call failed:', error);

    // Handle specific error types
    if (error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key. Please check your Google AI API key in settings.');
    } else if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('API quota exceeded. Please check your Google AI Studio account.');
    }

    throw error;
  }
}