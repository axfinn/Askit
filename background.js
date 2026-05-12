// Background service worker for AskIt

// Store for page actions when popup is closed
let pendingPageAction = null;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askWithAskIt',
    title: 'Ask with AskIt',
    contexts: ['selection']
  });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // From content script: capture screenshot
  if (request.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ imageData: dataUrl });
      }
    });
    return true; // Keep channel open for async response
  }

  // From content script: page action (summarize, translate, screenshot, etc.)
  if (request.action === 'pageAction') {
    pendingPageAction = request;

    // Try to send to popup if open
    chrome.runtime.sendMessage({
      action: 'pageAction',
      ...request
    }).catch(() => {
      // Popup not open - will check on popup open
    });
    return true;
  }

  // From popup: request for pending page action
  if (request.action === 'getPendingPageAction') {
    sendResponse(pendingPageAction);
    pendingPageAction = null;
    return true;
  }

  // From content script: show selection (text selected)
  if (request.action === 'showSelection' && request.text) {
    chrome.runtime.sendMessage({
      action: 'showSelection',
      text: request.text
    }).catch(() => {
      // Popup not open
    });
    return true;
  }
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'askWithAskIt' && info.selectionText) {
    // Send selected text to popup
    chrome.runtime.sendMessage({
      action: 'showSelection',
      text: info.selectionText
    }).catch(() => {
      // Popup not open
    });
  }
});

// Badge text
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: 'AI' });
});
