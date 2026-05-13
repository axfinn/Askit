const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'nav', 'footer', 'header:not(article header)',
  'aside', '[role="banner"]', '[role="navigation"]',
  '[role="complementary"]', '[role="contentinfo"]',
  '.sidebar', '.nav', '.menu', '.ad', '.advertisement',
  '.comment-form', '.share-buttons', '.social',
  '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
  '[class*="banner"]', '[id*="ad-"]', '[class*="ad-"]',
]

const CONTENT_SELECTORS = [
  'article', '[role="article"]', 'main', '[role="main"]',
  '.post-content', '.article-content', '.entry-content',
  '.content', '#content', '.post-body', '.story-body',
]

interface ExtractedContent {
  title: string
  content: string
  url: string
}

export function extractPageContent(): string {
  const extracted = extractSmart()
  if (!extracted.content) return ''

  let result = `# ${extracted.title}\n\n`
  result += extracted.content
  return result.substring(0, 6000)
}

function extractSmart(): ExtractedContent {
  const title = document.title || ''
  const url = location.href

  const siteContent = extractBySite(url)
  if (siteContent) return { title, content: siteContent, url }

  const semanticContent = extractBySemanticTags()
  if (semanticContent && semanticContent.length > 200) {
    return { title, content: semanticContent, url }
  }

  const densityContent = extractByTextDensity()
  return { title, content: densityContent, url }
}

function extractBySite(url: string): string | null {
  if (url.includes('bilibili.com/video')) return extractBilibili()
  if (url.includes('youtube.com/watch')) return extractYouTube()
  if (url.includes('github.com') && !url.includes('/issues') && !url.includes('/pull')) return extractGitHub()
  if (url.includes('zhihu.com')) return extractZhihu()
  return null
}

function extractBilibili(): string {
  const parts: string[] = []
  const title = document.querySelector('h1.video-title, .video-title')?.textContent?.trim()
  if (title) parts.push(`## ${title}`)

  const desc = document.querySelector('.basic-desc-info, .desc-info-text')?.textContent?.trim()
  if (desc) parts.push(`\n${desc}`)

  const tags = Array.from(document.querySelectorAll('.tag-link, .video-tag'))
    .map(el => el.textContent?.trim()).filter(Boolean)
  if (tags.length) parts.push(`\nTags: ${tags.join(', ')}`)

  const comments = Array.from(document.querySelectorAll('.reply-content .reply-content-container'))
    .slice(0, 10)
    .map(el => `- ${el.textContent?.trim()}`)
    .filter(t => t.length > 3)
  if (comments.length) parts.push(`\n## 热门评论\n${comments.join('\n')}`)

  return parts.join('\n')
}

function extractYouTube(): string {
  const parts: string[] = []
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.textContent?.trim()
  if (title) parts.push(`## ${title}`)

  const desc = document.querySelector('#description-inline-expander, #description')?.textContent?.trim()
  if (desc) parts.push(`\n${desc.substring(0, 2000)}`)

  return parts.join('\n')
}

function extractGitHub(): string {
  const readme = document.querySelector('#readme article, .markdown-body')
  if (readme) return domToMarkdown(readme as HTMLElement).substring(0, 5000)
  return ''
}

function extractZhihu(): string {
  const article = document.querySelector('.Post-RichText, .RichContent-inner')
  if (article) return domToMarkdown(article as HTMLElement)
  return ''
}

function extractBySemanticTags(): string {
  for (const selector of CONTENT_SELECTORS) {
    const el = document.querySelector(selector) as HTMLElement | null
    if (el) {
      const text = domToMarkdown(el)
      if (text.length > 200) return text
    }
  }
  return ''
}

function extractByTextDensity(): string {
  const candidates = document.querySelectorAll('div, section')
  let best: HTMLElement | null = null
  let bestScore = 0

  candidates.forEach(el => {
    const htmlEl = el as HTMLElement
    if (htmlEl.closest('nav, footer, header, aside')) return
    if (htmlEl.offsetHeight < 100) return

    const text = htmlEl.innerText || ''
    const textLen = text.length
    const linkText = Array.from(htmlEl.querySelectorAll('a'))
      .reduce((sum, a) => sum + (a.textContent?.length || 0), 0)
    const density = textLen > 0 ? (textLen - linkText) / textLen : 0
    const score = (textLen - linkText) * density

    if (score > bestScore && textLen > 200) {
      bestScore = score
      best = htmlEl
    }
  })

  if (best) return domToMarkdown(best)
  return document.body.innerText?.replace(/\s+/g, ' ').trim().substring(0, 4000) || ''
}

function domToMarkdown(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  NOISE_SELECTORS.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove())
  })
  return nodeToMd(clone).trim()
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\s+/g, ' ') || ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(nodeToMd).join('')

  switch (tag) {
    case 'h1': return `\n# ${children.trim()}\n`
    case 'h2': return `\n## ${children.trim()}\n`
    case 'h3': return `\n### ${children.trim()}\n`
    case 'h4': case 'h5': case 'h6': return `\n#### ${children.trim()}\n`
    case 'p': return `\n${children.trim()}\n`
    case 'br': return '\n'
    case 'li': return `\n- ${children.trim()}`
    case 'ul': case 'ol': return `\n${children}\n`
    case 'blockquote': return `\n> ${children.trim()}\n`
    case 'pre': case 'code':
      if (tag === 'pre') return `\n\`\`\`\n${el.textContent?.trim()}\n\`\`\`\n`
      return `\`${children.trim()}\``
    case 'strong': case 'b': return `**${children.trim()}**`
    case 'em': case 'i': return `*${children.trim()}*`
    case 'a': {
      const href = el.getAttribute('href')
      const text = children.trim()
      if (!text) return ''
      return href ? `[${text}](${href})` : text
    }
    case 'img': return ''
    case 'table': return extractTable(el)
    default: return children
  }
}

function extractTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (!rows.length) return ''

  const result: string[] = []
  rows.forEach((row, i) => {
    const cells = Array.from(row.querySelectorAll('th, td'))
      .map(c => c.textContent?.trim() || '')
    result.push(`| ${cells.join(' | ')} |`)
    if (i === 0) result.push(`| ${cells.map(() => '---').join(' | ')} |`)
  })
  return `\n${result.join('\n')}\n`
}
