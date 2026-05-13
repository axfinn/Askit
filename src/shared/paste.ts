const PASTE_API = 'https://t.jaxiu.cn/api/paste'
const PASTE_VIEW = 'https://t.jaxiu.cn/paste'
const SHORTURL_API = 'https://t.jaxiu.cn/api/shorturl'

export interface PasteOptions {
  content: string
  title?: string
  language?: string
  expires_in?: number
  max_views?: number
  password?: string
}

export interface PasteResult {
  id: string
  url: string
  expires_at: string
  max_views: number
}

async function uploadFile(content: string, filename: string, mimeType: string): Promise<string> {
  const blob = new Blob([content], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, filename)

  const response = await fetch(`${PASTE_API}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.id || data.filename
}

export async function createPaste(options: PasteOptions): Promise<PasteResult> {
  // Sanitize content: escape patterns that the paste API blocks (e.g. <script>)
  const sanitized = options.content.replace(/<(script|iframe|object|embed)/gi, '&lt;$1')

  const body = {
    content: sanitized,
    title: options.title || '',
    language: options.language || 'text',
    expires_in: options.expires_in ?? 24,
    max_views: options.max_views ?? 0,
    password: options.password || '',
    file_ids: [] as string[],
    admin_password: '',
  }

  // If content is too large, upload as a text file to avoid size limits
  if (sanitized.length > 50000) {
    const fileId = await uploadFile(sanitized, `share-${Date.now()}.txt`, 'text/plain')
    body.file_ids = [fileId]
    body.content = ''
  }

  const response = await fetch(PASTE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Paste API ${response.status}: ${text}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    url: `${PASTE_VIEW}/${data.id}`,
    expires_at: data.expires_at,
    max_views: data.max_views,
  }
}

export async function getPaste(id: string): Promise<{ content: string; title: string; language: string }> {
  const response = await fetch(`${PASTE_API}/${id}`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Paste API ${response.status}: ${text}`)
  }
  const data = await response.json()
  return { content: data.content, title: data.title, language: data.language }
}

export function formatConversationAsMarkdown(messages: { role: string; content: string }[], title?: string): string {
  const lines: string[] = []
  const t = title || 'AskIt 对话记录'
  lines.push(`# ${t}`)
  lines.push('')
  lines.push(`> 🤖 由 AskIt AI 助手导出 · ${new Date().toLocaleString('zh-CN')}`)
  lines.push('')

  const filtered = messages.filter(m => m.content && !m.content.startsWith('Error:') && !m.content.startsWith('分享失败'))

  for (const msg of filtered) {
    if (msg.role === 'user') {
      lines.push('---')
      lines.push('')
      lines.push(`**👤 用户：**`)
      lines.push('')
      lines.push(`> ${msg.content.replace(/\n/g, '\n> ')}`)
      lines.push('')
    } else {
      lines.push(`**🤖 AI：**`)
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push(`<sub>共 ${filtered.length} 条消息 · Powered by AskIt</sub>`)
  return lines.join('\n')
}

export function formatConversationAsHTML(messages: { role: string; content: string }[], title?: string): string {
  const t = title || 'AskIt 对话记录'
  const msgHtml = messages.map(msg => {
    const isUser = msg.role === 'user'
    const escaped = msg.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    return `<div style="margin:12px 0;padding:12px 16px;border-radius:12px;max-width:85%;${
      isUser
        ? 'margin-left:auto;background:linear-gradient(135deg,#7c3aed,#6366f1);color:#fff;'
        : 'margin-right:auto;background:#f3f4f6;color:#1f2937;'
    }"><div style="font-size:11px;opacity:0.7;margin-bottom:4px;">${isUser ? '👤 用户' : '🤖 AI'}</div><div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escaped}</div></div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${t}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC',sans-serif;background:#f9fafb;padding:20px;min-height:100vh}.container{max-width:720px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden}.header{padding:20px 24px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:12px}.header h1{font-size:18px;color:#1f2937}.header .badge{font-size:11px;background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:12px}.messages{padding:16px 24px}.footer{padding:12px 24px;border-top:1px solid #f3f4f6;text-align:center;font-size:11px;color:#9ca3af}</style>
</head>
<body><div class="container"><div class="header"><h1>${t}</h1><span class="badge">${messages.length} 条消息</span></div><div class="messages">${msgHtml}</div><div class="footer">由 AskIt AI 助手导出 · ${new Date().toLocaleString('zh-CN')}</div></div></body>
</html>`
}

export interface ShortUrlResult {
  id: string
  short_url: string
  expires_at: string
  max_clicks: number
}

export async function createShortUrl(originalUrl: string): Promise<ShortUrlResult> {
  const response = await fetch(SHORTURL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_url: originalUrl }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`短链生成失败: ${text}`)
  }

  return await response.json()
}
