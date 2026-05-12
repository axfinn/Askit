chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'askit-explain',
    title: '✦ AskIt: 解释选中内容',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({
    id: 'askit-translate',
    title: '✦ AskIt: 翻译选中内容',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({
    id: 'askit-summarize',
    title: '✦ AskIt: 总结选中内容',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return

  const actionMap: Record<string, string> = {
    'askit-explain': 'explain',
    'askit-translate': 'translate',
    'askit-summarize': 'summarize',
  }

  const action = actionMap[info.menuItemId as string]
  if (!action) return

  chrome.tabs.sendMessage(tab.id, {
    type: 'ASKIT_ACTION',
    action,
    text: info.selectionText,
  })
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'ASKIT_TOGGLE_SIDEBAR' })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ASKIT_CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(sender.tab!.windowId!, { format: 'png' }, (dataUrl) => {
      sendResponse({ imageData: dataUrl ?? null, error: chrome.runtime.lastError?.message })
    })
    return true
  }
})
