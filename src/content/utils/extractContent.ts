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

  let result = `# ${title}\n\nURL: ${url}\n\n`
  if (structured) result += structured + '\n\n---\n\n'
  result += fullText

  return result.substring(0, 15000)
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
