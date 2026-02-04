// OGP情報取得API

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const url = typeof query.url === 'string' ? query.url.trim() : null

  if (!url) {
    throw createError({ statusCode: 400, message: 'URLが必要です' })
  }

  // URLの検証
  let targetUrl: URL
  try {
    targetUrl = new URL(url.startsWith('www.') ? `https://${url}` : url)
  } catch {
    throw createError({ statusCode: 400, message: '無効なURLです' })
  }

  // 許可されたプロトコルのみ（http, https）
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    throw createError({ statusCode: 400, message: 'サポートされていないプロトコルです' })
  }

  try {
    // HTMLを取得
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnigiriBot/1.0; +https://onigiri.app)'
      },
      signal: AbortSignal.timeout(10000) // 10秒でタイムアウト
    })

    if (!response.ok) {
      throw createError({ statusCode: response.status, message: 'ページの取得に失敗しました' })
    }

    const html = await response.text()

    // OGP情報を抽出
    const ogp: {
      title?: string
      description?: string
      image?: string
      url?: string
      siteName?: string
    } = {}

    // og:title または title
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
      html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      ogp.title = titleMatch[1].trim()
    }

    // og:description または meta description
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
    if (descMatch) {
      ogp.description = descMatch[1].trim()
    }

    // og:image
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i)
    if (imageMatch) {
      const imageUrl = imageMatch[1].trim()
      // 相対URLの場合は絶対URLに変換
      if (imageUrl.startsWith('//')) {
        ogp.image = `${targetUrl.protocol}${imageUrl}`
      } else if (imageUrl.startsWith('/')) {
        ogp.image = `${targetUrl.protocol}//${targetUrl.host}${imageUrl}`
      } else if (!imageUrl.startsWith('http')) {
        ogp.image = `${targetUrl.protocol}//${targetUrl.host}/${imageUrl}`
      } else {
        ogp.image = imageUrl
      }
    }

    // og:url
    const urlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:url["']/i)
    if (urlMatch) {
      ogp.url = urlMatch[1].trim()
    } else {
      ogp.url = targetUrl.toString()
    }

    // og:site_name
    const siteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i) ||
      html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:site_name["']/i)
    if (siteNameMatch) {
      ogp.siteName = siteNameMatch[1].trim()
    }

    return {
      url: ogp.url || targetUrl.toString(),
      title: ogp.title || targetUrl.hostname,
      description: ogp.description,
      image: ogp.image,
      siteName: ogp.siteName || targetUrl.hostname
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    console.error('OGP取得エラー:', err)
    throw createError({ statusCode: 500, message: 'OGP情報の取得に失敗しました' })
  }
})
