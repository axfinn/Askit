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

  let result = `# ${extracted.title}\n\nURL: ${extracted.url}\n\n`
  result += extracted.content
  return result.substring(0, 15000)
}

function extractSmart(): ExtractedContent {
  const title = document.title || ''
  const url = location.href

  const siteContent = extractBySite(url)
  if (siteContent && siteContent.length > 200) return { title, content: siteContent, url }

  const semanticContent = extractBySemanticTags()
  if (semanticContent && semanticContent.length > 200) {
    return { title, content: semanticContent, url }
  }

  const densityContent = extractByTextDensity()
  if (densityContent && densityContent.length > 200) {
    return { title, content: densityContent, url }
  }

  // Ultimate fallback: grab all visible text from body
  return { title, content: extractFullPageText(), url }
}

function extractBySite(url: string): string | null {
  if (url.includes('bilibili.com/video')) return extractBilibili()
  if (url.includes('youtube.com/watch')) return extractYouTube()
  if (url.includes('github.com') && !url.includes('/issues') && !url.includes('/pull')) return extractGitHub()
  if (url.includes('zhihu.com')) return extractZhihu()
  if (url.includes('weibo.com') || url.includes('weibo.cn')) return extractWeibo()
  if (url.includes('twitter.com') || url.includes('x.com')) return extractTwitter()
  return null
}

function extractBilibili(): string {
  const parts: string[] = []
  const title = document.querySelector('h1.video-title, .video-title, [class*="title"]')?.textContent?.trim()
  if (title) parts.push(`## ${title}`)

  // UP主信息
  const upName = document.querySelector('.up-name, [class*="username"], .up-info .name')?.textContent?.trim()
  if (upName) parts.push(`UP主: ${upName}`)

  // 视频数据
  const stats = document.querySelector('.video-data, [class*="video-info-detail"]')?.textContent?.trim()
  if (stats) parts.push(`数据: ${stats}`)

  // 简介
  const desc = document.querySelector('.basic-desc-info, .desc-info-text, [class*="desc"], .video-desc')?.textContent?.trim()
  if (desc) parts.push(`\n简介: ${desc}`)

  // Tags
  const tags = Array.from(document.querySelectorAll('.tag-link, .video-tag, [class*="tag"] a'))
    .map(el => el.textContent?.trim()).filter(Boolean)
  if (tags.length) parts.push(`\nTags: ${tags.join(', ')}`)

  // 评论
  const comments = Array.from(document.querySelectorAll('.reply-content .reply-content-container, .reply-item .root-reply .reply-content, [class*="reply-content"]'))
    .slice(0, 20)
    .map(el => {
      const text = (el as HTMLElement).innerText?.trim()
      return text ? `- ${text}` : ''
    })
    .filter(t => t.length > 5)
  if (comments.length) parts.push(`\n## 评论 (${comments.length}条)\n${comments.join('\n')}`)

  // 如果以上都没抓到多少，用页面主体内容兜底
  if (parts.join('').length < 200) {
    const main = document.querySelector('#app, #bilibili-player') as HTMLElement
    if (main) {
      const text = main.innerText?.trim()
      if (text) parts.push(`\n${text.substring(0, 10000)}`)
    }
  }

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

function extractWeibo(): string {
  const parts: string[] = []

  // Get all visible feed items / tweet cards
  const feedItems = document.querySelectorAll('[class*="Feed_body"], [class*="wbpro-feed"], .card-wrap .card, [class*="detail_wbtext"], [node-type="feed_content"], .WB_detail, .Feed_body_3R0rO')
  if (feedItems.length > 0) {
    feedItems.forEach((item, i) => {
      const text = (item as HTMLElement).innerText?.trim()
      if (text && text.length > 10) {
        if (i > 0) parts.push('\n---\n')
        parts.push(text)
      }
    })
  }

  // Fallback: grab main content area
  if (!parts.length) {
    const main = document.querySelector('[class*="Main_full"], .WB_frame_c, main, [class*="detail"]') as HTMLElement
    if (main) parts.push(main.innerText?.trim() || '')
  }

  // Comments
  const comments = Array.from(document.querySelectorAll('[class*="comment_text"], [node-type="comment_content"], .list_box .list_li .WB_text'))
    .slice(0, 15)
    .map(el => `- ${(el as HTMLElement).innerText?.trim()}`)
    .filter(t => t.length > 5)
  if (comments.length) parts.push(`\n## 评论\n${comments.join('\n')}`)

  return parts.join('\n')
}

function extractTwitter(): string {
  const parts: string[] = []
  const tweets = document.querySelectorAll('[data-testid="tweetText"], article [lang]')
  tweets.forEach((el, i) => {
    const text = (el as HTMLElement).innerText?.trim()
    if (text && text.length > 5) {
      if (i > 0) parts.push('\n---\n')
      parts.push(text)
    }
  })
  return parts.join('\n')
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
  // Collect all substantial text blocks instead of just the single best one
  const candidates = document.querySelectorAll('div, section, article, main')
  const blocks: { el: HTMLElement; score: number }[] = []

  candidates.forEach(el => {
    const htmlEl = el as HTMLElement
    if (htmlEl.closest('nav, footer, header, aside, [class*="ad"]')) return
    if (htmlEl.offsetHeight < 50) return
    // Skip if a parent is already collected
    if (blocks.some(b => b.el.contains(htmlEl))) return

    const text = htmlEl.innerText || ''
    const textLen = text.length
    if (textLen < 100) return
    const linkText = Array.from(htmlEl.querySelectorAll('a'))
      .reduce((sum, a) => sum + (a.textContent?.length || 0), 0)
    const density = textLen > 0 ? (textLen - linkText) / textLen : 0
    const score = (textLen - linkText) * density

    if (score > 500) {
      // Remove children that are already in blocks
      const filtered = blocks.filter(b => !htmlEl.contains(b.el))
      filtered.push({ el: htmlEl, score })
      blocks.length = 0
      blocks.push(...filtered)
    }
  })

  blocks.sort((a, b) => b.score - a.score)
  const best = blocks[0]
  if (best) return domToMarkdown(best.el)

  return ''
}

function extractFullPageText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  NOISE_SELECTORS.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove())
  })
  const text = clone.innerText || ''
  // Collapse excessive whitespace but keep paragraph breaks
  return text.replace(/\n{3,}/g, '\n\n').trim().substring(0, 14000)
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
