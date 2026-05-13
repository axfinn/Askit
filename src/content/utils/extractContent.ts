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

  // Always get full visible page text as the base
  const fullText = extractFullPageText()

  // Site-specific structured data as prefix (if available)
  const structured = extractStructured(url)

  // Extract page images and links for AI access
  const images = extractPageImages()
  const links = extractPageLinks()

  let result = `# ${title}\n\nURL: ${url}\n\n`
  if (structured) result += structured + '\n\n---\n\n'
  result += fullText
  if (images) result += `\n\n---\n\n## 页面图片\n${images}`
  if (links) result += `\n\n## 页面链接\n${links}`

  return result.substring(0, 18000)
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

function extractPageLinks(): string {
  const seen = new Set<string>()
  const results: string[] = []

  document.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href') || ''
    let url = href
    if (url.startsWith('//')) url = 'https:' + url
    else if (url.startsWith('/')) url = location.origin + url
    if (!url.startsWith('http')) return
    if (seen.has(url)) return
    seen.add(url)
    const text = el.textContent?.trim().substring(0, 80) || ''
    if (!text) return
    results.push(`${text}: ${url}`)
  })

  return results.length > 0 ? results.slice(0, 50).join('\n') : ''
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
