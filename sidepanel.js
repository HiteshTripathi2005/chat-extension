function sendMessage() {
  const messageInput = document.getElementById('message');
  const sendButton = document.getElementById('sendButton');
  const message = messageInput.value.trim();

  if (message) {
    addMessage(message, 'user');
    messageInput.value = '';

    // Disable button during search
    sendButton.disabled = true;
    sendButton.textContent = 'Searching...';

    // Send message to background script to search DOM
    chrome.runtime.sendMessage({ action: 'searchDOM', prompt: message }, (response) => {
      // Reset button state
      sendButton.disabled = false;
      sendButton.textContent = 'Send';

      if (chrome.runtime.lastError) {
        addMessage('Error: Could not search the webpage.', 'bot');
        return;
      }

      if (response.error) {
        addMessage('Error: ' + response.error, 'bot');
        return;
      }

      if (response.found) {
        addMessage('Found: "' + message + '"', 'bot');
      } else {
        addMessage('Not found: "' + message + '"', 'bot');
      }
    });
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

document.getElementById('message').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

document.getElementById('sendButton').addEventListener('click', function() {
  sendMessage();
});

document.getElementById('closeButton').addEventListener('click', function() {
  window.close();
});