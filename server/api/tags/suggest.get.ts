// タグサジェストAPI（既存のタグ一覧を取得）

import { sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const limit = Math.min(Number(query.limit) || 20, 50)

  // すべての投稿からタグを抽出
  const tagRows = await db
    .select({
      tags: schema.posts.tags
    })
    .from(schema.posts)
    .where(sql`${schema.posts.tags} IS NOT NULL`)

  // タグを集計
  const tagCounts = new Map<string, number>()
  for (const row of tagRows) {
    if (!row.tags) continue
    try {
      const tags = JSON.parse(row.tags) as unknown
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === 'string' && tag.trim()) {
            const normalizedTag = tag.trim()
            tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1)
          }
        }
      }
    } catch {
      // JSON解析エラーは無視
    }
  }

  // タグを配列に変換してソート
  let tags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count) // 使用回数が多い順

  // 検索文字列がある場合はフィルタリング
  if (search) {
    const searchLower = search.toLowerCase()
    tags = tags.filter(t => t.tag.toLowerCase().includes(searchLower))
  }

  // 制限を適用
  tags = tags.slice(0, limit)

  return {
    tags: tags.map(t => t.tag),
    total: tagCounts.size
  }
})
