// AskIt Background Service Worker

let pendingAction = null;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askWithAskIt',
    title: '✦ Ask with AskIt',
    contexts: ['selection']
  });

  chrome.action.setBadgeText({ text: 'AI' });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // From content script: do action (summarize, translate, etc.)
  if (request.action === 'doAction') {
    pendingAction = request;

    // Try to notify popup
    chrome.runtime.sendMessage({
      action: 'notifyAction',
      ...request
    }).catch(() => {
      // Popup not open - will get pending when opened
    });
    return true;
  }

  // From popup: get pending action
  if (request.action === 'getPendingAction') {
    sendResponse(pendingAction);
    pendingAction = null;
    return true;
  }

  // From popup: clear pending
  if (request.action === 'clearPending') {
    pendingAction = null;
    return true;
  }

  // From content script: capture screenshot
  if (request.action === 'captureScreenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id !== chrome.tabs.TAB_ID_NONE) {
        chrome.tabs.captureVisibleTab(tabs[0].windowId, { format: 'png' }, (dataUrl) => {
          sendResponse({ imageData: dataUrl || null, error: chrome.runtime.lastError?.message });
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  return true;
});

// Context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'askWithAskIt' && info.selectionText) {
    pendingAction = {
      action: 'doAction',
      type: 'explain',
      content: info.selectionText,
      title: tab.title || 'Selection'
    };

    chrome.runtime.sendMessage({
      action: 'notifyAction',
      type: 'explain',
      content: info.selectionText,
      title: tab.title || 'Selection'
    }).catch(() => {});
  }
});

// Badge
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: 'AI' });
});