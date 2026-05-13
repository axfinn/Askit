export async function extractYouTubeTranscript(): Promise<string | null> {
  if (location.href.includes('bilibili.com')) {
    return extractBilibiliContent()
  }

  try {
    const videoId = new URLSearchParams(location.search).get('v')
    if (!videoId) return null

    const pageHtml = document.documentElement.innerHTML
    const captionMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/)
    if (!captionMatch) return getFallbackContent()

    const tracks = JSON.parse(captionMatch[1])
    if (!tracks.length) return getFallbackContent()

    const track = tracks.find((t: any) => t.languageCode === 'zh') || tracks[0]
    const response = await fetch(track.baseUrl)
    const xml = await response.text()

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const texts = Array.from(doc.querySelectorAll('text'))
      .map(node => node.textContent?.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"') ?? '')
      .filter(Boolean)

    return texts.join(' ')
  } catch {
    return getFallbackContent()
  }
}

function extractBilibiliContent(): string | null {
  const title = document.querySelector('h1.video-title')?.textContent
    || document.querySelector('.video-title')?.textContent
    || document.title
  const desc = document.querySelector('.basic-desc-info')?.textContent
    || document.querySelector('.desc-info-text')?.textContent
    || ''
  const tags = Array.from(document.querySelectorAll('.tag-link, .video-tag'))
    .map(el => el.textContent?.trim())
    .filter(Boolean)
    .join(', ')

  // Try to get subtitle/danmaku content for context
  const subtitles = Array.from(document.querySelectorAll('.bpx-player-subtitle-panel-text'))
    .map(el => el.textContent?.trim())
    .filter(Boolean)
    .join(' ')

  if (!title) return null
  let content = `视频标题: ${title}\n`
  if (desc) content += `\n简介: ${desc}\n`
  if (tags) content += `\n标签: ${tags}\n`
  if (subtitles) content += `\n字幕内容: ${subtitles}\n`
  return content
}

function getFallbackContent(): string | null {
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent
  const description = document.querySelector('#description-inline-expander yt-formatted-string')?.textContent
  if (!title) return null
  return `Video Title: ${title}\n\nDescription: ${description || 'N/A'}`
}

export function getVideoInfo(): { title: string; platform: string } | null {
  if (location.href.includes('bilibili.com')) {
    const title = document.querySelector('h1.video-title')?.textContent
      || document.querySelector('.video-title')?.textContent
      || document.title.replace(' - 哔哩哔哩', '')
    return title ? { title, platform: 'Bilibili' } : null
  }
  const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent
  return title ? { title, platform: 'YouTube' } : null
}
