chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'searchDOM') {
    const prompt = request.prompt;

    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && (tabs[0].url.startsWith('http://') || tabs[0].url.startsWith('https://'))) {
        // Execute script in the active tab to search DOM
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: searchDOMContent,
          args: [prompt]
        }, (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }

          if (results && results[0] && results[0].result !== undefined) {
            sendResponse({ found: results[0].result });
          } else {
            sendResponse({ found: false });
          }
        });
      } else {
        sendResponse({ error: 'No active webpage found' });
      }
    });

    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Function to be executed in the tab context
function searchDOMContent(prompt) {
  return document.body.innerText.includes(prompt);
}