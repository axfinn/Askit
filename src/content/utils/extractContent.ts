const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  '[role="banner"]', '[role="navigation"]',
  '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
  '[id*="ad-"]', '[class*="ad-container"]',
]

interface ExtractedContent {
  title: string
  content: string
  url: string
}

export function extractPageContent(): string {
  const title = document.title || ''
  const url = location.href

  // Extract structured content cards (title + image + link + metadata)
  const cards = extractContentCards()

  // Site-specific structured data
  const structured = extractStructured(url)

  // Full visible text
  const fullText = extractFullPageText()

  // Standalone images not captured by cards
  const images = extractPageImages()

  let result = `# ${title}\n\nURL: ${url}\n\n`
  if (structured) result += structured + '\n\n---\n\n'
  if (cards) result += `## 页面内容卡片\n${cards}\n\n---\n\n`
  result += fullText
  if (images) result += `\n\n---\n\n## 页面图片资源\n${images}`

  return result.substring(0, 20000)
}

function extractContentCards(): string {
  const cards: string[] = []

  // Common card patterns across sites
  const cardSelectors = [
    // Bilibili
    '.bili-video-card', '.video-card', '.feed-card', '.floor-single-card',
    '.bili-live-card', '[class*="video-card"]', '[class*="VideoCard"]',
    // YouTube
    'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
    // Generic
    'article', '[role="article"]', '.card', '.post', '.item',
    '[class*="feed-item"]', '[class*="post-item"]', '[class*="article-item"]',
    '[class*="content-card"]', '[class*="recommend"]',
  ]

  let cardEls: Element[] = []
  for (const sel of cardSelectors) {
    const els = document.querySelectorAll(sel)
    if (els.length >= 2) {
      cardEls = Array.from(els)
      break
    }
  }

  // If no card pattern found, try generic approach
  if (cardEls.length === 0) {
    // Look for repeated sibling structures with images
    const containers = document.querySelectorAll('ul, ol, [class*="list"], [class*="grid"], [class*="feed"]')
    for (const container of containers) {
      const children = Array.from(container.children).filter(c => {
        const img = c.querySelector('img')
        const text = c.textContent?.trim()
        return img && text && text.length > 10
      })
      if (children.length >= 3) {
        cardEls = children
        break
      }
    }
  }

  for (const card of cardEls.slice(0, 40)) {
    const el = card as HTMLElement
    const parts: string[] = []

    // Title
    const titleEl = el.querySelector('h1, h2, h3, h4, [class*="title"], a[title]')
    const cardTitle = titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || ''
    if (cardTitle) parts.push(`标题: ${cardTitle}`)

    // Link
    const linkEl = el.querySelector('a[href]')
    let href = linkEl?.getAttribute('href') || ''
    if (href.startsWith('//')) href = 'https:' + href
    else if (href.startsWith('/')) href = location.origin + href
    if (href.startsWith('http')) parts.push(`链接: ${href}`)

    // Image
    const imgEl = el.querySelector('img, [data-src], source')
    const imgSrc = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || imgEl?.getAttribute('data-original') || ''
    let imgUrl = imgSrc
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl
    if (imgUrl.startsWith('http')) parts.push(`封面: ${imgUrl}`)

    // Author/UP主
    const authorEl = el.querySelector('[class*="author"], [class*="name"], [class*="up"], [class*="user"], .owner')
    const author = authorEl?.textContent?.trim()
    if (author && author.length < 30) parts.push(`作者: ${author}`)

    // Stats (views, likes, duration, time)
    const statsEl = el.querySelector('[class*="count"], [class*="stat"], [class*="view"], [class*="play"], [class*="duration"], time')
    const stats = statsEl?.textContent?.trim()
    if (stats && stats.length < 50) parts.push(`数据: ${stats}`)

    // Description/summary
    const descEl = el.querySelector('[class*="desc"], [class*="summary"], [class*="intro"], p')
    const desc = descEl?.textContent?.trim()
    if (desc && desc.length > 10 && desc !== cardTitle) parts.push(`描述: ${desc.substring(0, 150)}`)

    if (parts.length >= 2) {
      cards.push(parts.join(' | '))
    }
  }

  return cards.join('\n')
}

function extractPageImages(): string {
  const seen = new Set<string>()
  const results: string[] = []

  document.querySelectorAll('img, [data-src], [data-original], source[srcset], video[poster]').forEach(el => {
    const urls = [
      el.getAttribute('src'),
      el.getAttribute('data-src'),
      el.getAttribute('data-original'),
      el.getAttribute('data-lazy-src'),
      el.getAttribute('poster'),
    ].filter(Boolean) as string[]

    // srcset
    const srcset = el.getAttribute('srcset')
    if (srcset) {
      srcset.split(',').forEach(s => {
        const u = s.trim().split(/\s+/)[0]
        if (u) urls.push(u)
      })
    }

    for (let u of urls) {
      if (u.startsWith('//')) u = 'https:' + u
      if (!u.startsWith('http')) continue
      if (seen.has(u)) continue
      // Skip tiny icons/tracking pixels
      const w = parseInt(el.getAttribute('width') || '0')
      const h = parseInt(el.getAttribute('height') || '0')
      if ((w > 0 && w < 50) || (h > 0 && h < 50)) continue
      if (u.includes('1x1') || u.includes('pixel') || u.includes('blank')) continue
      seen.add(u)
      const alt = el.getAttribute('alt') || el.getAttribute('title') || ''
      results.push(alt ? `${alt}: ${u}` : u)
    }
  })

  return results.length > 0 ? results.slice(0, 80).join('\n') : ''
}

function extractStructured(url: string): string | null {
  if (url.includes('bilibili.com')) return extractBilibili()
  if (url.includes('youtube.com/watch')) return extractYouTube()
  if (url.includes('zhihu.com')) return extractZhihu()
  if (url.includes('weibo.com') || url.includes('weibo.cn')) return extractWeibo()
  if (url.includes('twitter.com') || url.includes('x.com')) return extractTwitter()
  return null
}

function extractFullPageText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  NOISE_SELECTORS.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove())
  })
  const text = clone.innerText || ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

function extractBilibili(): string {
  const parts: string[] = []
  const title = document.querySelector('h1.video-title, .video-title, [class*="title"]')?.textContent?.trim()
  if (title) parts.push(`视频标题: ${title}`)

  const upName = document.querySelector('.up-name, [class*="username"], .up-info .name')?.textContent?.trim()
  if (upName) parts.push(`UP主: ${upName}`)

  const desc = document.querySelector('.basic-desc-info, .desc-info-text, [class*="desc"], .video-desc')?.textContent?.trim()
  if (desc) parts.push(`简介: ${desc}`)

  return parts.join('\n')
}

function extractYouTube(): string {
  const parts: string[] = []
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.textContent?.trim()
  if (title) parts.push(`视频标题: ${title}`)

  const desc = document.querySelector('#description-inline-expander, #description')?.textContent?.trim()
  if (desc) parts.push(`简介: ${desc.substring(0, 3000)}`)

  return parts.join('\n')
}

function extractZhihu(): string {
  const article = document.querySelector('.Post-RichText, .RichContent-inner') as HTMLElement
  if (article) return article.innerText?.trim() || ''
  return ''
}

function extractWeibo(): string {
  const parts: string[] = []
  const feedItems = document.querySelectorAll('[class*="Feed_body"], [class*="wbpro-feed"], .card-wrap .card, [class*="detail_wbtext"], [node-type="feed_content"], .WB_detail')
  feedItems.forEach((item, i) => {
    const text = (item as HTMLElement).innerText?.trim()
    if (text && text.length > 10) {
      if (i > 0) parts.push('---')
      parts.push(text)
    }
  })
  return parts.join('\n')
}

function extractTwitter(): string {
  const parts: string[] = []
  const tweets = document.querySelectorAll('[data-testid="tweetText"], article [lang]')
  tweets.forEach((el, i) => {
    const text = (el as HTMLElement).innerText?.trim()
    if (text && text.length > 5) {
      if (i > 0) parts.push('---')
      parts.push(text)
    }
  })
  return parts.join('\n')
}
