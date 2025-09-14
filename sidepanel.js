// Global variables
let apiKey = '';
let conversationHistory = [];

// Initialize the extension
document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  setupEventListeners();
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

  // Add user message to chat
  addMessage(message, 'user');
  messageInput.value = '';

  // Disable input during processing
  sendButton.disabled = true;
  sendButton.textContent = 'Thinking...';

  try {
    // Send message to background script for AI processing
    const response = await chrome.runtime.sendMessage({
      action: 'askAI',
      message: message,
      history: conversationHistory
    });

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    if (response.error) {
      throw new Error(response.error);
    }

    // Add AI response to chat
    addMessage(response.reply, 'bot');

    // Update conversation history
    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: response.reply });

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

  } catch (error) {
    console.error('Error sending message:', error);
    addMessage('Sorry, I encountered an error. Please try again.', 'bot');
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = 'Send';
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