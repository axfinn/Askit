chrome.runtime.onInstalled.addListener(() => {
  const menus = [
    { id: 'askit-explain', title: '✦ AskIt: 解释' },
    { id: 'askit-translate', title: '✦ AskIt: 翻译' },
    { id: 'askit-summarize', title: '✦ AskIt: 总结' },
    { id: 'askit-rewrite', title: '✦ AskIt: 改写' },
    { id: 'askit-grammar', title: '✦ AskIt: 语法检查' },
  ]
  menus.forEach(m => chrome.contextMenus.create({ id: m.id, title: m.title, contexts: ['selection'] }))
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return
  const action = (info.menuItemId as string).replace('askit-', '')
  chrome.tabs.sendMessage(tab.id, { type: 'ASKIT_ACTION', action, text: info.selectionText }).catch(() => {})
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-sidebar' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'ASKIT_TOGGLE_SIDEBAR' }).catch(() => {})
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ASKIT_CAPTURE_SCREENSHOT') {
    const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ imageData: null, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ imageData: dataUrl ?? null })
      }
    })
    return true
  }

  if (message.type === 'ASKIT_WEB_SEARCH') {
    const query = message.query
    const apiKey = message.apiKey
    const doSearch = async () => {
      // Use MiniMax coding_plan/search API
      if (apiKey) {
        try {
          const resp = await fetch('https://api.minimaxi.com/v1/coding_plan/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ q: query }),
          })
          if (resp.ok) {
            const data = await resp.json()
            if (data.base_resp?.status_code === 0 && data.organic?.length > 0) {
              return data.organic.slice(0, 6).map((r: any) => `${r.title}: ${r.snippet}`).join('\n\n')
            }
          }
        } catch {}
      }
      // Fallback: DuckDuckGo
      try {
        const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        })
        const html = await resp.text()
        const results: string[] = []
        const snippetRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
        let match
        while ((match = snippetRegex.exec(html)) && results.length < 5) {
          const title = match[1].replace(/<[^>]+>/g, '').trim()
          const snippet = match[2].replace(/<[^>]+>/g, '').trim()
          if (title && snippet) results.push(`${title}: ${snippet}`)
        }
        if (results.length > 0) return results.join('\n')
      } catch {}
      return `搜索"${query}"暂时无法获取结果，请基于已有知识回答。`
    }
    doSearch().then(results => sendResponse({ results }))
    return true
  }
})
