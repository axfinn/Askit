// Background service worker for AskIt

// Store for pending page actions when popup is not open
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
        chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error('Screenshot error:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ imageData: dataUrl });
          }
        });
      } else {
        sendResponse({ error: 'Cannot capture: no active tab' });
      }
    });
    return true;
  }

  // From content script: page action (summarize, translate, screenshot, chat, extract)
  if (request.action === 'pageAction') {
    pendingPageAction = request;

    // Send to popup if it's open, otherwise store for later
    chrome.runtime.sendMessage({
      action: 'notifyPageAction',
      ...request
    }).catch(() => {
      // Popup not open - will retrieve when popup opens
    });
    return true;
  }

  // From popup: get pending page action
  if (request.action === 'getPendingPageAction') {
    sendResponse(pendingPageAction);
    pendingPageAction = null;
    return true;
  }

  // From popup: clear pending action
  if (request.action === 'clearPendingPageAction') {
    pendingPageAction = null;
    return true;
  }

  // From content script: context menu selection
  if (request.action === 'contextMenuSelection') {
    pendingPageAction = {
      action: 'pageAction',
      type: 'extract',
      content: request.text
    };
    return true;
  }

  return true;
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'askWithAskIt' && info.selectionText) {
    // Send selected text to popup
    pendingPageAction = {
      action: 'pageAction',
      type: 'extract',
      content: info.selectionText
    };

    chrome.runtime.sendMessage({
      action: 'notifyPageAction',
      type: 'extract',
      content: info.selectionText
    }).catch(() => {
      // Popup not open
    });
  }
});

// Badge
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: 'AI' });
});