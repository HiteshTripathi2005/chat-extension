// Global variables
let apiKey = '';
let conversationHistory = [];
let currentStreamingMessage = null;
let isStreaming = false;

// Initialize the extension
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
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

  // Close button
  document.getElementById('closeButton').addEventListener('click', function() {
    window.close();
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

  // Add loading state and streaming indicator
  sendButton.disabled = true;
  sendButton.textContent = 'Thinking...';
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
    sendButton.textContent = 'Send';
    isStreaming = false;
  }
}

function addMessage(text, sender) {
  const chat = document.getElementById('chat');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + sender;
  messageDiv.textContent = text;
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
    const chat = document.getElementById('chat');
    chat.scrollTop = chat.scrollHeight;
  }
}

function handleStreamComplete(request) {
  if (currentStreamingMessage && request.fullText) {
    currentStreamingMessage.textContent = request.fullText;
    currentStreamingMessage.classList.remove('streaming');

    // Update conversation history
    const lastUserMessage = conversationHistory[conversationHistory.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      conversationHistory.push({ role: 'assistant', content: request.fullText });
    }

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
  }

  // Reset streaming state
  currentStreamingMessage = null;
  isStreaming = false;

  // Reset button
  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = false;
  sendButton.textContent = 'Send';
}

function handleStreamError(request) {
  removeStreamingMessage();
  addMessage(request.error || 'Sorry, I encountered an error. Please try again.', 'bot');

  // Reset streaming state
  isStreaming = false;

  // Reset button
  const sendButton = document.getElementById('sendButton');
  sendButton.disabled = false;
  sendButton.textContent = 'Send';
}