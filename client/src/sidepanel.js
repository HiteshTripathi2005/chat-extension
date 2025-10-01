// Global variables
let apiKey = '';
let conversationHistory = [];
let currentStreamingMessage = null;
let isStreaming = false;
let currentTabUrl = '';
let hasSelectedElement = false;
let selectedElementInfo = null;

// Import marked for markdown rendering
import { marked } from 'marked';

// Initialize the extension
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  getCurrentTabUrl().then(url => {
    currentTabUrl = url;
    loadConversationHistory();
  });
  setupEventListeners();
  setupMessageListeners();
});

function setupEventListeners() {
  // Chat functionality
  document.getElementById('message').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  document.getElementById('sendButton').addEventListener('click', function() {
    sendMessage();
  });

  // Settings functionality
  document.getElementById('settingsButton').addEventListener('click', function() {
    openSettings();
  });

  document.getElementById('closeSettings').addEventListener('click', function() {
    closeSettings();
  });

  document.getElementById('saveSettings').addEventListener('click', function() {
    saveSettings();
  });

  // New chat functionality
  document.getElementById('newChatButton').addEventListener('click', function() {
    startNewChat();
  });

  // Close button
  document.getElementById('closeButton').addEventListener('click', function() {
    window.close();
  });

  // Element selection button
  document.getElementById('selectElementButton').addEventListener('click', function() {
    startElementSelection();
  });

  // Clear selection button
  document.getElementById('clearSelectionButton').addEventListener('click', function() {
    clearSelectedElement();
  });
}

function setupMessageListeners() {
  // Listen for streaming messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'streamChunk') {
      handleStreamChunk(request);
    } else if (request.action === 'streamComplete') {
      handleStreamComplete(request);
    } else if (request.action === 'streamError') {
      handleStreamError(request);
    } else if (request.action === 'tabChanged') {
      handleTabChangeFromMessage(request);
    } else if (request.action === 'elementSelectionComplete') {
      handleElementSelected(request.content);
    } else if (request.action === 'elementSelectionCancelled') {
      handleSelectionCancelled();
    } else if (request.action === 'selectionError') {
      handleSelectionError(request.error);
    }
  });
}

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      apiKey = result.geminiApiKey;
      // Pre-fill the settings input if opening settings
      const apiKeyInput = document.getElementById('apiKey');
      if (apiKeyInput) {
        apiKeyInput.value = apiKey;
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function getCurrentTabUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.url || '';
  } catch (error) {
    console.error('Error getting current tab URL:', error);
    return '';
  }
}

async function loadConversationHistory() {
  if (!currentTabUrl) return;
  try {
    const result = await chrome.storage.local.get([currentTabUrl]);
    if (result[currentTabUrl]) {
      conversationHistory = result[currentTabUrl];
      // Re-render existing messages
      renderConversationHistory();
    }
  } catch (error) {
    console.error('Error loading conversation history:', error);
  }
}

async function handleTabChangeFromMessage(request) {
  const newUrl = request.url;

  // If the URL hasn't changed, do nothing
  if (newUrl === currentTabUrl) return;

  // Save current history before switching
  if (currentTabUrl) {
    await saveConversationHistory();
  }

  // Update to new tab
  currentTabUrl = newUrl;

  // Clear current conversation
  conversationHistory = [];
  const chat = document.getElementById('chat');
  chat.innerHTML = '';

  // Load history for new tab
  await loadConversationHistory();
}

async function saveConversationHistory() {
  if (!currentTabUrl) return;
  try {
    await chrome.storage.local.set({ [currentTabUrl]: conversationHistory });
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
}

function renderConversationHistory() {
  const chat = document.getElementById('chat');
  chat.innerHTML = ''; // Clear existing messages
  conversationHistory.forEach(item => {
    addMessage(item.content, item.role === 'user' ? 'user' : 'bot');
  });
}

function openSettings() {
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKey');

  // Load current API key into the input
  apiKeyInput.value = apiKey;
  settingsPanel.classList.add('show');
}

function closeSettings() {
  const settingsPanel = document.getElementById('settingsPanel');
  settingsPanel.classList.remove('show');
}

async function saveSettings() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('settingsStatus');

  const newApiKey = apiKeyInput.value.trim();

  if (!newApiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  try {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    // Save to Chrome storage
    await chrome.storage.sync.set({ geminiApiKey: newApiKey });
    apiKey = newApiKey;

    showStatus('Settings saved successfully!', 'success');

    // Close settings after a short delay
    setTimeout(() => {
      closeSettings();
    }, 1500);

  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings. Please try again.', 'error');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Settings';
  }
}

async function startNewChat() {
  // Confirm with user before clearing
  if (!confirm('Are you sure you want to start a new chat? This will clear all conversation history for this website.')) {
    return;
  }

  try {
    // Clear conversation history
    conversationHistory = [];

    // Clear chat UI
    const chat = document.getElementById('chat');
    chat.innerHTML = '';

    // Remove history from storage
    if (currentTabUrl) {
      await chrome.storage.local.remove([currentTabUrl]);
    }

    // Reset streaming state if active
    if (isStreaming) {
      isStreaming = false;
      const sendButton = document.getElementById('sendButton');
      sendButton.disabled = false;
      sendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
      removeStreamingMessage();
    }

  } catch (error) {
    console.error('Error starting new chat:', error);
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('settingsStatus');
  statusDiv.textContent = message;
  statusDiv.className = type === 'success' ? 'status-success' : 'status-error';
}

async function sendMessage() {
  const messageInput = document.getElementById('message');
  const sendButton = document.getElementById('sendButton');
  const message = messageInput.value.trim();

  if (!message) return;

  if (!apiKey) {
    addMessage('Please configure your Google AI API key in settings first.', 'bot');
    openSettings();
    return;
  }

  // Prevent multiple concurrent requests
  if (isStreaming) {
    return;
  }

  // Add user message to chat
  addMessage(message, 'user');
  messageInput.value = '';

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: message });
  saveConversationHistory();

  // Add loading state and streaming indicator
  sendButton.disabled = true;
  sendButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  isStreaming = true;

  // Create streaming message placeholder
  addStreamingMessage();

  try {
    // Send message to background script for streaming AI processing
    chrome.runtime.sendMessage({
      action: 'askAIStream',
      message: message,
      history: conversationHistory
    });

  } catch (error) {
    console.error('Error sending message:', error);
    removeStreamingMessage();
    addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    isStreaming = false;
  }
}

function addMessage(text, sender) {
  const chat = document.getElementById('chat');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + sender;
  
  // Render markdown for bot messages, plain text for user messages
  if (sender === 'bot') {
    messageDiv.innerHTML = marked.parse(text);
  } else {
    messageDiv.textContent = text;
  }
  
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

function addStreamingMessage() {
  const chat = document.getElementById('chat');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot streaming';
  messageDiv.textContent = '';
  chat.appendChild(messageDiv);
  currentStreamingMessage = messageDiv;
  chat.scrollTop = chat.scrollHeight;
}

function removeStreamingMessage() {
  if (currentStreamingMessage) {
    currentStreamingMessage.remove();
    currentStreamingMessage = null;
  }
}

function handleStreamChunk(request) {
  if (currentStreamingMessage && request.chunk) {
    currentStreamingMessage.textContent += request.chunk;
    // Render markdown for streaming content
    currentStreamingMessage.innerHTML = marked.parse(currentStreamingMessage.textContent);
    const chat = document.getElementById('chat');
    chat.scrollTop = chat.scrollHeight;
  }
}

function handleStreamComplete(request) {
  if (currentStreamingMessage && request.displayText) {
    currentStreamingMessage.innerHTML = marked.parse(request.displayText);
    currentStreamingMessage.classList.remove('streaming');

    // Update conversation history with fullText (includes tool outputs for context)
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      conversationHistory.push({ role: 'assistant', content: request.fullText });
    }

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    // Save updated history
    saveConversationHistory();
  }

  // Reset streaming state
  currentStreamingMessage = null;
  isStreaming = false;

  // Reset button
  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = false;
  sendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
}

function handleStreamError(request) {
  removeStreamingMessage();
  addMessage(request.error || 'Sorry, I encountered an error. Please try again.', 'bot');

  // Reset streaming state
  isStreaming = false;

  // Reset button
  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = false;
  sendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
}

// Element selection functions
async function startElementSelection() {
  try {
    const selectButton = document.getElementById('selectElementButton');
    selectButton.disabled = true;
    selectButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    // Request background script to start element selection
    chrome.runtime.sendMessage({ action: 'startElementSelection' });
    
  } catch (error) {
    console.error('Error starting element selection:', error);
    const selectButton = document.getElementById('selectElementButton');
    selectButton.disabled = false;
    selectButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
  }
}

function handleElementSelected(content) {
  hasSelectedElement = true;
  selectedElementInfo = content;
  
  // Update UI to show selection
  const banner = document.getElementById('selectedElementBanner');
  const bannerText = document.getElementById('selectedElementText');
  
  let elementDescription = content.tagName;
  if (content.id) {
    elementDescription += `#${content.id}`;
  } else if (content.classes) {
    const firstClass = content.classes.split(' ')[0];
    if (firstClass) {
      elementDescription += `.${firstClass}`;
    }
  }
  
  bannerText.textContent = `Selected: <${elementDescription}>`;
  banner.style.display = 'flex';
  
  // Reset select button
  const selectButton = document.getElementById('selectElementButton');
  selectButton.disabled = false;
  selectButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
  
  // Show confirmation message
  addMessage(`Element selected: <${elementDescription}>. Your next questions will focus on this element.`, 'bot');
}

function handleSelectionCancelled() {
  // Reset select button
  const selectButton = document.getElementById('selectElementButton');
  selectButton.disabled = false;
  selectButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
}

function handleSelectionError(error) {
  // Reset select button
  const selectButton = document.getElementById('selectElementButton');
  selectButton.disabled = false;
  selectButton.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
  
  // Show error message
  addMessage(error || 'Failed to start element selection. Please try again.', 'bot');
}

async function clearSelectedElement() {
  hasSelectedElement = false;
  selectedElementInfo = null;
  
  // Hide banner
  const banner = document.getElementById('selectedElementBanner');
  banner.style.display = 'none';
  
  // Clear selection in background
  await chrome.runtime.sendMessage({ action: 'clearSelectedElement' });
  
  // Show confirmation
  addMessage('Selection cleared. Returning to full page context.', 'bot');
}