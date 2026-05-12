// Background service worker for AskIt

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askWithAskIt',
    title: 'Ask with AskIt',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'askWithAskIt' && info.selectionText) {
    // Send selected text to popup
    chrome.runtime.sendMessage({
      action: 'showSelection',
      text: info.selectionText
    });
  }
});

// Badge text
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: 'AI' });
});
