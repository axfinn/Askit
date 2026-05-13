import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/shared/store'
import { streamChat, chatCompletion, generateImage, textToSpeech, generateMusic, generateLyrics, musicCoverPreprocess, generateMusicCover, understandImage } from '@/shared/api'
import { createPaste, getPaste, formatConversationAsMarkdown, createShortUrl } from '@/shared/paste'
import { ChatMessage } from './components/ChatMessage'
import { ModelSelector } from './components/ModelSelector'
import { HistoryPanel } from './components/HistoryPanel'
import { WritingTemplates } from './components/WritingTemplates'
import { PageBanner } from './components/PageBanner'
import { extractPageContent } from './utils/extractContent'
import { detectPageType } from './utils/detectPage'
import { extractYouTubeTranscript } from './utils/youtube'
import type { Message, PageType } from '@/shared/types'

type TabId = 'chat' | 'write' | 'tools'

const TOOL_GROUPS = [
  { title: '页面', tools: [
    { id: 'summarize', icon: '📄', label: '总结' },
    { id: 'translate', icon: '🌐', label: '翻译' },
    { id: 'extract', icon: '📝', label: '大纲' },
    { id: 'page-translate', icon: '🔤', label: '全页翻译' },
    { id: 'screenshot', icon: '📸', label: '截图提问' },
  ]},
  { title: 'AI 创作', tools: [
    { id: 'image-gen', icon: '🎨', label: '绘画' },
    { id: 'image-recognize', icon: '👁️', label: '识图' },
    { id: 'tts', icon: '🔊', label: '朗读' },
    { id: 'music', icon: '🎵', label: '作曲' },
    { id: 'music-cover', icon: '🎤', label: '翻唱' },
  ]},
  { title: '提取', tools: [
    { id: 'extract-images', icon: '🖼️', label: '图片' },
    { id: 'extract-comments', icon: '💬', label: '评论' },
    { id: 'extract-links', icon: '🔗', label: '链接' },
  ]},
  { title: '分享', tools: [
    { id: 'share-chat', icon: '📤', label: '分享对话' },
    { id: 'share-page', icon: '🌍', label: '分享页面' },
    { id: 'short-url', icon: '🔗', label: '短链' },
    { id: 'analyze-paste', icon: '📋', label: '分析粘贴板' },
  ]},
] as const

export function Sidebar() {
  const { settings, messages, sidebarOpen, isStreaming, addMessage, updateLastMessage, setStreaming, setSidebarOpen, toggleSidebar, newConversation, loadSettings, setShowHistory } = useStore()
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [pendingFeature, setPendingFeature] = useState<string | null>(null)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [pageType, setPageType] = useState<PageType>('normal')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(420)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resizingRef = useRef(false)
  const pageUrlRef = useRef<string>(location.href)

  useEffect(() => { loadSettings() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (sidebarOpen) inputRef.current?.focus() }, [sidebarOpen])
  useEffect(() => { setPageType(detectPageType()) }, [sidebarOpen])

  // New page → new conversation
  useEffect(() => {
    if (!sidebarOpen) return
    const currentUrl = location.href
    if (pageUrlRef.current !== currentUrl && messages.length > 0) {
      newConversation()
    }
    pageUrlRef.current = currentUrl
  }, [sidebarOpen])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return
      const newWidth = Math.min(Math.max(startWidth + (startX - ev.clientX), 320), window.innerWidth * 0.8)
      setSidebarWidth(newWidth)
    }
    const onUp = () => {
      resizingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const listener = (msg: any) => {
      try {
        if (msg.type === 'ASKIT_ACTION') {
          setSidebarOpen(true)
          setActiveTab('chat')
          handleQuickActionWithText(msg.action, msg.text)
        }
      } catch {}
    }
    try {
      chrome.runtime.onMessage.addListener(listener)
    } catch {}
    return () => {
      try { chrome.runtime.onMessage.removeListener(listener) } catch {}
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent).detail?.text
      if (text) doStreamChat(text)
    }
    const screenshotHandler = () => doScreenshot()
    document.addEventListener('askit-regenerate', handler)
    document.addEventListener('askit-do-stream', handler)
    document.addEventListener('askit-do-screenshot', screenshotHandler)
    return () => {
      document.removeEventListener('askit-regenerate', handler)
      document.removeEventListener('askit-do-stream', handler)
      document.removeEventListener('askit-do-screenshot', screenshotHandler)
    }
  }, [settings, messages])

  const handleInputResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }, [])

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) readImageFile(file)
        return
      }
    }
  }

  function readImageFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setPendingImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) readImageFile(file)
    e.target.value = ''
  }

  async function handleSend() {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (isStreaming) return
    const currentSettings = useStore.getState().settings
    if (!currentSettings.apiKey) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '请先在插件 Popup 中设置 API Key', timestamp: Date.now() })
      return
    }

    if (pendingImage) {
      const imageData = pendingImage
      const userContent = text || '请描述这张图片'
      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `🖼️ ${userContent}`, timestamp: Date.now(), imageUrl: imageData }
      addMessage(userMsg)
      setInput('')
      setPendingImage(null)
      if (inputRef.current) inputRef.current.style.height = 'auto'
      await doVisionChat(userContent, imageData)
      return
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() }
    addMessage(userMsg)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    if (pendingFeature) {
      const feature = pendingFeature
      setPendingFeature(null)
      await handleFeatureInput(feature, text)
    } else {
      await doStreamChat(text)
    }
  }

  async function doStreamChat(text: string) {
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() }
    addMessage(assistantMsg)
    setStreaming(true)

    const pageContext = extractPageContent()
    let systemPrompt = 'You are a helpful AI assistant. Respond in the same language as the user.'
    if (pageContext) {
      systemPrompt = `You are a helpful AI assistant. The user is browsing: "${document.title}" (${location.href}).\n\nPage content (excerpt):\n${pageContext.substring(0, 3000)}\n\nUse this context to answer questions. Respond in the same language as the user.`
    }

    const currentMessages = useStore.getState().messages
    const currentSettings = useStore.getState().settings
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...currentMessages.filter((m) => m.role !== 'system' && m.content && m.id !== assistantMsg.id).slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ]

    const abort = new AbortController()
    abortRef.current = abort
    let fullText = ''

    try {
      await streamChat(currentSettings, chatMessages, {
        onToken: (token) => { fullText += token; updateLastMessage(fullText) },
        onDone: () => {},
        onError: (err) => updateLastMessage(`Error: ${err.message}`),
      }, abort.signal, { webSearch: webSearchEnabled })
      generateSuggestions(fullText, currentSettings)
    } catch (err: any) {
      if (err.name !== 'AbortError') updateLastMessage(`Error: ${err.message}`)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  function generateSuggestions(lastReply: string, currentSettings: typeof settings) {
    if (!lastReply || lastReply.startsWith('Error:')) return
    setSuggestions([])
    const recentMsgs = useStore.getState().messages.slice(-6)
    const context = recentMsgs.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.substring(0, 200)}`).join('\n')
    chatCompletion(currentSettings, [
      { role: 'user', content: `根据以下对话，生成3个用户可能想继续追问的简短问题。

对话内容：
${context}

严格按以下JSON格式输出，不要输出任何其他内容：
["问题1", "问题2", "问题3"]` },
    ]).then(text => {
      const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = cleaned.match(/\[[\s\S]*?\]/)
      if (jsonMatch) {
        try {
          const arr = JSON.parse(jsonMatch[0])
          const lines = arr.filter((s: any) => typeof s === 'string' && s.length >= 2 && s.length <= 25).slice(0, 3)
          if (lines.length > 0) { setSuggestions(lines); return }
        } catch {}
      }
      const lines = cleaned.split('\n')
        .map((l: string) => l.replace(/^\d+[.、)\]]\s*/, '').replace(/^[-•*]\s*/, '').replace(/^["'"「」]/g, '').replace(/["'"「」]$/g, '').trim())
        .filter((l: string) => l.length >= 2 && l.length <= 25)
        .slice(0, 3)
      if (lines.length > 0) setSuggestions(lines)
    }).catch(() => {})
  }

  async function doVisionChat(text: string, imageDataUrl: string) {
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '🔍 正在分析图片...', timestamp: Date.now() }
    addMessage(assistantMsg)
    setStreaming(true)
    setSuggestions([])

    const currentSettings = useStore.getState().settings

    try {
      const result = await understandImage(currentSettings, text, imageDataUrl)
      updateLastMessage(result)
      generateSuggestions(result, currentSettings)
    } catch (err: any) {
      updateLastMessage(`Error: ${err.message}`)
    } finally {
      setStreaming(false)
    }
  }

  function handleFeature(featureId: string) {
    const pageContent = extractPageContent()

    if (['summarize', 'translate', 'extract'].includes(featureId)) {
      const prompts: Record<string, string> = {
        summarize: `请用中文总结以下页面内容的要点（3-5条）：\n\n${pageContent}`,
        translate: `请将以下页面内容翻译成中文（如果已是中文则翻译为英文）：\n\n${pageContent?.substring(0, 4000)}`,
        extract: `请提取以下页面内容的大纲结构：\n\n${pageContent}`,
      }
      const labels: Record<string, string> = { summarize: '总结页面', translate: '翻译页面', extract: '提取大纲' }
      setActiveTab('chat')
      addMessage({ id: crypto.randomUUID(), role: 'user', content: `📄 ${labels[featureId]}`, timestamp: Date.now() })
      doStreamChat(prompts[featureId])
      return
    }

    if (featureId === 'page-translate') {
      doPageTranslate()
      return
    }

    if (featureId === 'screenshot') {
      doScreenshot()
      return
    }

    if (featureId === 'extract-images') {
      doExtractImages()
      return
    }

    if (featureId === 'extract-comments') {
      doExtractComments()
      return
    }

    if (featureId === 'extract-links') {
      doExtractLinks()
      return
    }

    if (featureId === 'share-chat') {
      doShareChat()
      return
    }

    if (featureId === 'share-page') {
      doSharePage()
      return
    }

    if (featureId === 'analyze-paste') {
      setActiveTab('chat')
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '📋 请输入粘贴板分享链接或 ID，我会获取内容并帮你分析', timestamp: Date.now() })
      setPendingFeature('analyze-paste')
      return
    }

    if (featureId === 'short-url') {
      doShortUrl()
      return
    }

    setActiveTab('chat')
    const hints: Record<string, string> = {
      'image-gen': '🎨 请描述你想生成的图片，例如："一只在星空下奔跑的白色独角兽，梦幻风格"',
      'image-recognize': '👁️ 请粘贴图片 URL 或描述你想识别的图片内容',
      'tts': '🔊 请输入要朗读的文本（支持中英文）',
      'music': '🎵 请描述音乐风格，例如："轻快的电子舞曲，带有钢琴旋律"',
    }
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: hints[featureId] || '功能开发中...', timestamp: Date.now() })
    setPendingFeature(featureId)
  }

  async function doPageTranslate() {
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '🔤 正在翻译页面...', timestamp: Date.now() })
    setActiveTab('chat')
    try {
      const textNodes = getPageTextNodes()
      const chunks = chunkTextNodes(textNodes, 2000)
      let translated = 0
      for (const chunk of chunks) {
        const texts = chunk.map(n => n.textContent || '')
        const prompt = `Translate the following texts to Chinese. Return ONLY the translations, one per line, in the same order. Do not add numbering or explanations.\n\n${texts.map((t, i) => `[${i}] ${t}`).join('\n')}`
        const currentSettings = useStore.getState().settings
        const response = await fetch(`${currentSettings.apiBase}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentSettings.apiKey}` },
          body: JSON.stringify({ model: currentSettings.model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
        })
        if (!response.ok) throw new Error('Translation API failed')
        const data = await response.json()
        const lines = (data.choices?.[0]?.message?.content || '').split('\n').filter(Boolean)
        chunk.forEach((node, i) => {
          if (lines[i]) {
            const cleaned = lines[i].replace(/^\[\d+\]\s*/, '')
            node.textContent = cleaned
          }
        })
        translated += chunk.length
        updateLastMessage(`🔤 已翻译 ${translated}/${textNodes.length} 段文本...`)
      }
      updateLastMessage(`✅ 页面翻译完成！共翻译 ${translated} 段文本。`)
    } catch (err: any) {
      updateLastMessage(`翻译失败: ${err.message}`)
    }
  }

  async function doScreenshot() {
    setActiveTab('chat')
    addMessage({ id: crypto.randomUUID(), role: 'user', content: '📸 截图提问', timestamp: Date.now() })
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '📸 正在截取屏幕...', timestamp: Date.now() })
    setStreaming(true)
    try {
      const response = await new Promise<any>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: 'ASKIT_CAPTURE_SCREENSHOT' }, resolve)
        } catch {
          resolve({ error: '扩展已更新，请刷新页面后重试' })
        }
      })
      if (!response?.imageData) throw new Error(response?.error || '截图失败，请刷新页面后重试')
      updateLastMessage(`📸 截图完成，正在分析...\n\n![截图](${response.imageData})`)
      const currentSettings = useStore.getState().settings
      const result = await understandImage(currentSettings, '请详细描述这张截图中的内容，包括文字、图片、布局等信息。如果有文字请提取出来。', response.imageData)
      updateLastMessage(`![截图](${response.imageData})\n\n${result}`)
    } catch (err: any) {
      const msg = err.message?.includes('invalidated') ? '扩展已更新，请刷新页面后重试（Ctrl+R）' : err.message
      updateLastMessage(`截图分析失败: ${msg}`)
    } finally {
      setStreaming(false)
    }
  }

  function doExtractImages() {
    setActiveTab('chat')
    const images = Array.from(document.querySelectorAll('img'))
      .map(img => img.src || img.dataset.src || '')
      .filter(src => src.startsWith('http') && !src.includes('data:'))
      .filter((src, i, arr) => arr.indexOf(src) === i)
    if (images.length === 0) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '未找到图片', timestamp: Date.now() })
      return
    }
    const content = `🖼️ 找到 ${images.length} 张图片：\n\n${images.map((url, i) => `${i + 1}. ${url}`).join('\n')}`
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() })
  }

  function doExtractComments() {
    setActiveTab('chat')
    const selectors = [
      '.comment-content', '.reply-content', // Bilibili
      '#content-text', // YouTube
      '.comment-body', '.comment_content', // Generic
      '[data-testid="comment"]', '.c-comment',
      '.review-content', '.post-content',
    ]
    let comments: string[] = []
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel)
      if (els.length > 0) {
        comments = Array.from(els).map(el => el.textContent?.trim() || '').filter(t => t.length > 2)
        break
      }
    }
    if (comments.length === 0) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '未找到评论内容，请确保评论区已加载', timestamp: Date.now() })
      return
    }
    const content = `💬 提取到 ${comments.length} 条评论：\n\n${comments.slice(0, 50).map((c, i) => `${i + 1}. ${c}`).join('\n\n')}`
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() })
  }

  function doExtractLinks() {
    setActiveTab('chat')
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.textContent?.trim() || '', href: (a as HTMLAnchorElement).href }))
      .filter(l => l.href.startsWith('http') && l.text.length > 0)
      .filter((l, i, arr) => arr.findIndex(x => x.href === l.href) === i)
      .slice(0, 100)
    if (links.length === 0) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '未找到链接', timestamp: Date.now() })
      return
    }
    const content = `🔗 找到 ${links.length} 个链接：\n\n${links.map((l, i) => `${i + 1}. [${l.text.substring(0, 60)}](${l.href})`).join('\n')}`
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() })
  }

  async function doShareChat() {
    setActiveTab('chat')
    const currentMessages = useStore.getState().messages
    if (currentMessages.length === 0) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '当前没有对话记录可分享', timestamp: Date.now() })
      return
    }
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '📤 正在生成分享链接...', timestamp: Date.now() })
    try {
      const title = `AskIt 对话 - ${currentMessages.find(m => m.role === 'user')?.content.substring(0, 30) || '未命名'}`
      const md = formatConversationAsMarkdown(currentMessages.map(m => ({ role: m.role, content: m.content })), title)
      const result = await createPaste({ content: md, title, language: 'markdown', expires_in: 72 })
      updateLastMessage(`📤 对话已分享！\n\n🔗 链接: ${result.url}\n⏰ 有效期: 72小时\n👁️ 最大访问: ${result.max_views} 次\n\n可直接发送链接给他人查看对话记录。`)
    } catch (err: any) {
      updateLastMessage(`分享失败: ${err.message}`)
    }
  }

  async function doSharePage() {
    setActiveTab('chat')
    const pageContent = extractPageContent()
    if (!pageContent) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '无法提取页面内容', timestamp: Date.now() })
      return
    }
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '🌍 正在分享页面内容...', timestamp: Date.now() })
    try {
      const title = document.title || '页面分享'
      const content = `# ${title}\n\n> 来源: ${location.href}\n> 时间: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n${pageContent.substring(0, 50000)}`
      const result = await createPaste({ content, title, language: 'markdown', expires_in: 72 })
      updateLastMessage(`🌍 页面内容已分享！\n\n🔗 链接: ${result.url}\n📄 标题: ${title}\n⏰ 有效期: 72小时\n\n可发送链接给他人查看页面内容摘要。`)
    } catch (err: any) {
      updateLastMessage(`分享失败: ${err.message}`)
    }
  }

  async function doShortUrl() {
    setActiveTab('chat')
    const url = location.href
    addMessage({ id: crypto.randomUUID(), role: 'user', content: `🔗 生成短链: ${url}`, timestamp: Date.now() })
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '🔗 正在生成短链...', timestamp: Date.now() })
    try {
      const result = await createShortUrl(url)
      updateLastMessage(`🔗 短链已生成！\n\n**原始链接:**\n${url}\n\n**短链接:**\n${result.short_url}\n\n⏰ 有效期: 30天\n👆 最大点击: ${result.max_clicks} 次\n\n可直接复制短链发送给他人。`)
    } catch (err: any) {
      updateLastMessage(`短链生成失败: ${err.message}`)
    }
  }

  async function doAnalyzePaste(input: string) {
    const idMatch = input.match(/(?:paste\/)?([a-f0-9]{8})/) || input.match(/^([a-f0-9]{8})$/)
    if (!idMatch) {
      updateLastMessage('无法识别粘贴板 ID，请输入完整链接或 8 位 ID')
      return
    }
    updateLastMessage('📋 正在获取粘贴板内容...')
    try {
      const paste = await getPaste(idMatch[1])
      const preview = paste.content.substring(0, 500)
      updateLastMessage(`📋 已获取粘贴板内容（${paste.content.length} 字符）\n\n**标题:** ${paste.title || '无'}\n**类型:** ${paste.language}\n\n**预览:**\n\`\`\`\n${preview}${paste.content.length > 500 ? '\n...' : ''}\n\`\`\`\n\n正在分析内容...`)
      const currentSettings = useStore.getState().settings
      const analysisPrompt = `请分析以下内容，给出摘要、关键信息和可能的后续建议：\n\n${paste.content.substring(0, 6000)}`
      let fullText = ''
      await streamChat(currentSettings, [{ role: 'user', content: analysisPrompt }], {
        onToken: (token) => {
          fullText += token
          updateLastMessage(`📋 粘贴板内容分析：\n\n${fullText}`)
        },
        onDone: () => {},
        onError: (err) => updateLastMessage(`分析失败: ${err.message}`),
      })
    } catch (err: any) {
      updateLastMessage(`获取失败: ${err.message}`)
    }
  }

  async function handleFeatureInput(featureId: string, userInput: string) {
    const currentSettings = useStore.getState().settings
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: Date.now() })
    setStreaming(true)
    try {
      if (featureId === 'image-gen') {
        updateLastMessage('🎨 正在生成图片...')
        const url = await generateImage(currentSettings, userInput)
        updateLastMessage(url ? `![生成的图片](${url})\n\n图片已生成！` : '图片生成失败，请重试。')
      } else if (featureId === 'tts') {
        updateLastMessage('🔊 正在合成语音...')
        const audioUrl = await textToSpeech(currentSettings, userInput)
        updateLastMessage(`语音已生成！\n\n<audio controls src="${audioUrl}"></audio>`)
      } else if (featureId === 'music') {
        updateLastMessage('🎵 正在生成歌词...')
        let lyrics = ''
        let styleTags = ''
        try {
          const result = await generateLyrics(currentSettings, userInput)
          lyrics = result.lyrics
          styleTags = result.tags
          if (lyrics) updateLastMessage(`🎵 歌词已生成，正在创作音乐...\n\n**${result.title}**\n${lyrics.substring(0, 200)}...`)
        } catch {
          lyrics = ''
        }
        if (!lyrics) updateLastMessage('🎵 正在创作音乐...')
        const musicPrompt = styleTags || userInput
        const audioUrl = await generateMusic(currentSettings, musicPrompt, lyrics || undefined)
        updateLastMessage(audioUrl ? `🎵 音乐已生成！\n\n${lyrics ? `**歌词：**\n${lyrics}\n\n` : ''}<audio controls src="${audioUrl}"></audio>` : '音乐生成失败，请重试。')
      } else if (featureId === 'music-cover') {
        updateLastMessage('🎤 请输入歌曲音频 URL...\n正在预处理音频特征...')
        const { coverFeatureId, formattedLyrics } = await musicCoverPreprocess(currentSettings, userInput)
        updateLastMessage(`🎤 特征提取完成！正在生成翻唱...\n\n**原歌词：**\n${formattedLyrics.substring(0, 300)}...`)
        const coverUrl = await generateMusicCover(currentSettings, coverFeatureId, formattedLyrics, '流行风格翻唱')
        updateLastMessage(coverUrl ? `🎤 翻唱已生成！\n\n<audio controls src="${coverUrl}"></audio>` : '翻唱生成失败，请重试。')
      } else if (featureId === 'image-recognize') {
        await doStreamChat(`请识别并描述这张图片的内容：${userInput}`)
        return
      } else if (featureId === 'analyze-paste') {
        await doAnalyzePaste(userInput)
      } else {
        updateLastMessage('该功能正在开发中...')
      }
    } catch (err: any) {
      updateLastMessage(`Error: ${err.message}`)
    } finally {
      setStreaming(false)
    }
  }

  function handleQuickActionWithText(action: string, text: string) {
    const prompts: Record<string, string> = {
      explain: `请用简洁的中文解释以下内容：\n\n"${text}"`,
      translate: `请翻译以下内容为中文（如果已经是中文则翻译为英文）：\n\n"${text}"`,
      summarize: `请用一两句话总结以下内容：\n\n"${text}"`,
    }
    addMessage({ id: crypto.randomUUID(), role: 'user', content: `${action}: "${text.substring(0, 100)}..."`, timestamp: Date.now() })
    doStreamChat(prompts[action] || text)
  }

  function handleTemplateSelect(prompt: string) {
    setActiveTab('chat')
    setInput(prompt)
    inputRef.current?.focus()
  }

  if (!sidebarOpen) return null

  return (
    <div className="askit-sidebar" style={{ width: sidebarWidth }}>
      <div className="askit-resize-handle" onMouseDown={handleResizeStart} />
      <HistoryPanel />

      {/* Header */}
      <div className="askit-header">
        <div className="askit-header-left">
          <button className="askit-header-btn" onClick={() => setShowHistory(true)} title="对话历史">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </button>
          <ModelSelector />
        </div>
        <div className="askit-header-right">
          <button className="askit-header-btn" onClick={doShareChat} title="分享对话">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
          <button className="askit-header-btn" onClick={() => { newConversation(); setPendingFeature(null) }} title="新对话">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
          <button className="askit-header-btn" onClick={() => setSidebarOpen(false)} title="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="askit-tabs">
        <button className={`askit-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>对话</button>
        <button className={`askit-tab ${activeTab === 'write' ? 'active' : ''}`} onClick={() => setActiveTab('write')}>写作</button>
        <button className={`askit-tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>工具</button>
      </div>

      {activeTab === 'write' ? (
        <WritingTemplates onSelect={handleTemplateSelect} />
      ) : activeTab === 'tools' ? (
        <div className="askit-features-scroll">
          {TOOL_GROUPS.map(group => (
            <div key={group.title} className="askit-tool-group">
              <div className="askit-tool-group-title">{group.title}</div>
              <div className="askit-features">
                {group.tools.map(f => (
                  <button key={f.id} className="askit-feature-card" onClick={() => handleFeature(f.id)}>
                    <div className="askit-feature-card-icon">{f.icon}</div>
                    <div className="askit-feature-card-label">{f.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Page-aware banner */}
          <PageBanner pageType={pageType} onAction={(action) => {
            if (action === 'youtube-summary') {
              addMessage({ id: crypto.randomUUID(), role: 'user', content: '📺 总结这个视频', timestamp: Date.now() })
              extractYouTubeTranscript().then(transcript => {
                if (transcript) {
                  doStreamChat(`请用中文总结以下视频内容的要点（5-8条）：\n\n${transcript.substring(0, 6000)}`)
                } else {
                  doStreamChat(`请根据页面标题和描述总结这个视频的内容：${document.title}`)
                }
              })
            } else if (action === 'pdf-summary') {
              addMessage({ id: crypto.randomUUID(), role: 'user', content: '📄 总结这个 PDF', timestamp: Date.now() })
              const content = extractPageContent()
              doStreamChat(`请总结以下 PDF 文档的要点：\n\n${content?.substring(0, 6000)}`)
            }
          }} />

          {/* Messages */}
          <div className="askit-messages">
            {messages.length === 0 && (
              <div className="askit-empty">
                <div className="askit-empty-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="askit-empty-text">有什么可以帮你的？</div>
                <div className="askit-empty-sub">Alt+J 切换 · 选中文字获取快捷操作</div>
                {/* Quick suggestions */}
                <div className="askit-quick-actions">
                  <button className="askit-quick-btn" onClick={() => handleFeature('summarize')}>📄 总结页面</button>
                  <button className="askit-quick-btn" onClick={() => handleFeature('translate')}>🌐 翻译页面</button>
                  <button className="askit-quick-btn" onClick={() => handleFeature('extract')}>📝 提取大纲</button>
                  <button className="askit-quick-btn" onClick={() => doScreenshot()}>📸 截图提问</button>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={msg.id} message={msg} isLast={i === messages.length - 1} />
            ))}
            {/* Suggested replies */}
            {suggestions.length > 0 && !isStreaming && (
              <div className="askit-suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="askit-suggestion-btn" onClick={() => {
                    setSuggestions([])
                    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: s, timestamp: Date.now() }
                    addMessage(userMsg)
                    doStreamChat(s)
                  }}>{s}</button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="askit-input-area">
            {/* Quick-fill chips */}
            {!input && messages.length === 0 && (
              <div className="askit-quickfill">
                <button onClick={() => setInput('帮我写一封邮件：')}>✍️ 写邮件</button>
                <button onClick={() => setInput('帮我翻译：')}>🌐 翻译</button>
                <button onClick={() => setInput('帮我总结这段内容：')}>📄 总结</button>
                <button onClick={() => setInput('帮我改写得更专业：')}>✨ 改写</button>
              </div>
            )}
            <div className="askit-input-toolbar">
              <button
                className={`askit-toolbar-btn ${webSearchEnabled ? 'active' : ''}`}
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                title="联网搜索"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                <span>联网</span>
              </button>
              <button className="askit-toolbar-btn" onClick={() => fileInputRef.current?.click()} title="上传图片">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
              </button>
              <button className="askit-toolbar-btn" onClick={doScreenshot} title="截图提问">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
            {pendingImage && (
              <div className="askit-image-preview">
                <img src={pendingImage} alt="preview" />
                <button onClick={() => setPendingImage(null)} className="askit-image-remove">✕</button>
              </div>
            )}
            <div className="askit-input-row">
              <textarea
                ref={inputRef}
                className="askit-input"
                value={input}
                onChange={handleInputResize}
                onPaste={handlePaste}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={pendingImage ? "描述图片或直接发送..." : "问我任何问题..."}
                rows={1}
              />
              {isStreaming ? (
                <button className="askit-send-btn stop" onClick={() => { abortRef.current?.abort(); setStreaming(false) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              ) : (
                <button className="askit-send-btn" onClick={handleSend} disabled={!input.trim() && !pendingImage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              )}
            </div>
            <div className="askit-input-footer">
              <span>{settings.model}</span>
              <span>Enter 发送 · Shift+Enter 换行</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function getPageTextNodes(): Text[] {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT
      if ((node.textContent?.trim().length || 0) < 2) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    }
  })
  const nodes: Text[] = []
  let node: Text | null
  while ((node = walker.nextNode() as Text | null)) nodes.push(node)
  return nodes
}

function chunkTextNodes(nodes: Text[], maxChars: number): Text[][] {
  const chunks: Text[][] = []
  let current: Text[] = []
  let currentLen = 0
  for (const node of nodes) {
    const len = node.textContent?.length || 0
    if (currentLen + len > maxChars && current.length > 0) {
      chunks.push(current)
      current = []
      currentLen = 0
    }
    current.push(node)
    currentLen += len
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}
