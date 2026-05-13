import type { PageType } from '@/shared/types'

export function detectPageType(): PageType {
  const url = location.href
  if (url.includes('youtube.com/watch') || url.includes('bilibili.com/video')) return 'youtube'
  if (url.endsWith('.pdf') || document.contentType === 'application/pdf') return 'pdf'
  if (
    url.includes('google.com/search') ||
    url.includes('bing.com/search') ||
    url.includes('baidu.com/s')
  ) return 'search'
  return 'normal'
}

export function getYouTubeVideoId(): string | null {
  const match = location.href.match(/[?&]v=([^&]+)/)
  return match?.[1] ?? null
}

export function getBilibiliVideoId(): string | null {
  const match = location.href.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

export function getSearchQuery(): string {
  const params = new URLSearchParams(location.search)
  return params.get('q') || params.get('wd') || params.get('query') || ''
}

export function isVideoPage(): boolean {
  return location.href.includes('youtube.com/watch') || location.href.includes('bilibili.com/video')
}

export function isBilibili(): boolean {
  return location.href.includes('bilibili.com/video')
}
