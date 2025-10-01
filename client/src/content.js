// Content script for DOM element selection
let isSelectionMode = false;
let selectedElement = null;
let highlightOverlay = null;

// Create highlight overlay element
function createHighlightOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'ai-assistant-highlight-overlay';
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.08);
    z-index: 2147483646;
    transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.2);
    border-radius: 4px;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

// Create selection indicator
function createSelectionIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'ai-assistant-selection-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 16px;
      right: 16px;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      cursor: default;
      user-select: none;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      max-width: 280px;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
        <span style="font-weight: 600; font-size: 15px;">Selection Mode</span>
      </div>
      <div style="font-size: 13px; color: rgba(255, 255, 255, 0.8); line-height: 1.4;">
        Click any element to select it
      </div>
      <div style="
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      ">
        Press <kbd style="
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
        ">ESC</kbd> to cancel
      </div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.2); }
      }
    </style>
  `;
  document.body.appendChild(indicator);
  return indicator;
}

// Highlight element on hover
function highlightElement(event) {
  if (!isSelectionMode || !highlightOverlay) return;
  
  const element = event.target;
  const rect = element.getBoundingClientRect();
  
  highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
  highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.display = 'block';
}

// Select element on click
function selectElement(event) {
  if (!isSelectionMode) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  selectedElement = event.target;
  
  // Extract content from selected element
  const elementContent = extractElementContent(selectedElement);
  
  // Send selected content to background script
  chrome.runtime.sendMessage({
    action: 'elementSelected',
    content: elementContent
  });
  
  // Exit selection mode
  exitSelectionMode();
}

// Extract content from element
function extractElementContent(element) {
  // Clone the element to avoid modifying the original
  const elementClone = element.cloneNode(true);
  
  // Remove all style elements
  const styleElements = elementClone.querySelectorAll('style');
  styleElements.forEach(style => style.remove());
  
  // Remove all link elements that are stylesheets
  const linkElements = elementClone.querySelectorAll('link[rel="stylesheet"]');
  linkElements.forEach(link => link.remove());
  
  // Remove all script elements
  const scriptElements = elementClone.querySelectorAll('script');
  scriptElements.forEach(script => script.remove());

  // Remove CSS class and style attributes from all elements
  const allElements = elementClone.querySelectorAll('*');
  allElements.forEach(el => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });

  // Get the cleaned HTML content
  const htmlContent = elementClone.innerHTML;
  
  // Get element type and attributes
  const tagName = element.tagName.toLowerCase();
  const id = element.id || '';
  const classList = Array.from(element.classList).join(' ');
  
  // Clean up excessive whitespace
  const cleanedHtml = htmlContent.replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit to 15000 chars

  return {
    tagName: tagName,
    id: id,
    classes: classList,
    content: cleanedHtml,
    textContent: element.textContent?.trim().substring(0, 5000) || '',
    url: window.location.href
  };
}

// Enter selection mode
function enterSelectionMode() {
  isSelectionMode = true;
  selectedElement = null;
  
  // Create overlay if it doesn't exist
  if (!highlightOverlay) {
    highlightOverlay = createHighlightOverlay();
  }
  
  // Create selection indicator
  const indicator = createSelectionIndicator();
  
  // Add event listeners
  document.addEventListener('mousemove', highlightElement, true);
  document.addEventListener('click', selectElement, true);
  
  // Add keyboard listener for ESC key
  document.addEventListener('keydown', handleKeyPress, true);
  
  // Change cursor
  document.body.style.cursor = 'crosshair';
}

// Exit selection mode
function exitSelectionMode() {
  isSelectionMode = false;
  
  // Remove overlay
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
  
  // Remove indicator
  const indicator = document.getElementById('ai-assistant-selection-indicator');
  if (indicator) {
    indicator.remove();
  }
  
  // Remove event listeners
  document.removeEventListener('mousemove', highlightElement, true);
  document.removeEventListener('click', selectElement, true);
  document.removeEventListener('keydown', handleKeyPress, true);
  
  // Reset cursor
  document.body.style.cursor = '';
}

// Handle keyboard events
function handleKeyPress(event) {
  if (event.key === 'Escape' || event.key === 'Esc') {
    exitSelectionMode();
    chrome.runtime.sendMessage({ action: 'selectionCancelled' });
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSelection') {
    enterSelectionMode();
    sendResponse({ success: true });
  } else if (request.action === 'cancelSelection') {
    exitSelectionMode();
    sendResponse({ success: true });
  }
  return true;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  exitSelectionMode();
});
