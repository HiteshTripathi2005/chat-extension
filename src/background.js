import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { buildAIPrompt } from './utils/prompt.js';
import { timeTool } from './tools/time-tool.js';

// Google AI API configuration
const GEMINI_MODEL = 'gemini-2.0-flash';

// Global API key storage for Vercel AI SDK
let currentApiKey = null;
let selectedElementContent = null; // Store selected element content

// Function to set API key globally for Vercel AI SDK
function setGlobalApiKey(apiKey) {
  currentApiKey = apiKey;
  // Set environment variable for Vercel AI SDK
  if (typeof globalThis !== 'undefined') {
    globalThis.process = globalThis.process || {};
    globalThis.process.env = globalThis.process.env || {};
    globalThis.process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }
}

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

// Listen for tab changes to notify side panel
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    // Send message to side panel about tab change
    chrome.runtime.sendMessage({
      action: 'tabChanged',
      url: tab.url,
      tabId: tab.id
    }).catch(() => {
      // Side panel might not be open, ignore error
    });
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id === tabId) {
      // Send message to side panel about tab update
      chrome.runtime.sendMessage({
        action: 'tabChanged',
        url: tab.url,
        tabId: tab.id
      }).catch(() => {
        // Side panel might not be open, ignore error
      });
    }
  }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'askAIStream') {
    handleAIRequestStream(request, sender);
    sendResponse({ success: true }); // Acknowledge the request immediately
    return true; // Keep message channel open for streaming
  } else if (request.action === 'startElementSelection') {
    startElementSelection();
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'elementSelected') {
    selectedElementContent = request.content;
    // Notify side panel that element was selected
    chrome.runtime.sendMessage({ 
      action: 'elementSelectionComplete',
      content: request.content 
    }).catch(() => {});
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'selectionCancelled') {
    selectedElementContent = null;
    chrome.runtime.sendMessage({ action: 'elementSelectionCancelled' }).catch(() => {});
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'clearSelectedElement') {
    selectedElementContent = null;
    sendResponse({ success: true });
    return true;
  }
});

// Function to start element selection mode
async function startElementSelection() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].url || (!tabs[0].url.startsWith('http://') && !tabs[0].url.startsWith('https://'))) {
      chrome.runtime.sendMessage({ 
        action: 'selectionError',
        error: 'Element selection is only available on web pages.'
      }).catch(() => {});
      return;
    }

    // Send message to content script to start selection
    await chrome.tabs.sendMessage(tabs[0].id, { action: 'startSelection' });
  } catch (error) {
    console.error('Error starting element selection:', error);
    chrome.runtime.sendMessage({ 
      action: 'selectionError',
      error: 'Failed to start element selection. Please refresh the page and try again.'
    }).catch(() => {});
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
    const messages = buildAIPrompt(request.message, webpageContent, request.history);

    // Make streaming API call to Gemini
    await callGeminiAPIStream(apiKey, messages, tabId);

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
    // If user has selected a specific element, use that instead
    if (selectedElementContent) {
      return {
        title: `Selected: ${selectedElementContent.tagName}${selectedElementContent.id ? '#' + selectedElementContent.id : ''}`,
        description: `Selected element from ${selectedElementContent.url}`,
        content: selectedElementContent.content,
        url: selectedElementContent.url,
        isSelectedElement: true
      };
    }
    
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
  // Clone the document body to avoid modifying the original
  const bodyClone = document.body.cloneNode(true);
  
  // Remove all style elements
  const styleElements = bodyClone.querySelectorAll('style');
  styleElements.forEach(style => style.remove());
  
  // Remove all link elements that are stylesheets
  const linkElements = bodyClone.querySelectorAll('link[rel="stylesheet"]');
  linkElements.forEach(link => link.remove());
  
  // Remove all script elements
  const scriptElements = bodyClone.querySelectorAll('script');
  scriptElements.forEach(script => script.remove());

  // Remove CSS class and style attributes from all elements
  const allElements = bodyClone.querySelectorAll('*');
  allElements.forEach(element => {
    element.removeAttribute('class');
    element.removeAttribute('style');
  });

  // Get the title and meta description
  const title = document.title || '';
  const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
  
  // Get the cleaned HTML content
  const htmlContent = bodyClone.innerHTML;
  
  // Clean up excessive whitespace but preserve HTML structure
  const cleanedHtml = htmlContent.replace(/\s+/g, ' ').trim().substring(0, 10000); // Limit to 10000 chars

  return {
    title: title,
    description: metaDescription,
    content: cleanedHtml,
    url: window.location.href
  };
}

async function callGeminiAPIStream(apiKey, messages, tabId) {
  try {
    // Set the API key globally for Vercel AI SDK
    setGlobalApiKey(apiKey);

    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages: messages,
      temperature: 0.7,
      // tools: {timeTool},
      onFinish: () => { console.log('Streaming complete'); }
    });

    let fullText = '';
    let chunkCount = 0;

    // Process the streaming response
    for await (const delta of result.textStream) {
      const chunk = delta;
      if (chunk) {
        fullText += chunk;
        chunkCount++;

        // Send chunk to frontend (using runtime messaging for side panel)
        try {
          chrome.runtime.sendMessage({
            action: 'streamChunk',
            chunk: chunk,
            fullText: fullText,
            isComplete: false
          });
        } catch (msgError) {
          console.error('Failed to send chunk:', msgError);
          // Don't throw here - continue with next chunk
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
    console.error('Vercel AI SDK streaming call failed:', error);

    // Handle specific error types
    let errorMessage = 'An error occurred while streaming the response.';
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('INVALID_ARGUMENT') || error.message.includes('API key is missing')) {
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