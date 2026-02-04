// 投稿作成API

import { eq } from 'drizzle-orm'

const MAX_TAGS = 5
const MAX_TAG_LENGTH = 30

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS)
    .map(t => t.slice(0, MAX_TAG_LENGTH))
}

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../utils/auth')
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    })
  }

  const body = await readBody(event)
  const { content, imageUrl, imageUrls, shopId, commentToId, repostOfId } = body
  const tags = parseTags(body.tags)

  const MAX_IMAGES = 4
  const urls: string[] = Array.isArray(imageUrls)
    ? imageUrls.filter((u): u is string => typeof u === 'string').slice(0, MAX_IMAGES)
    : (imageUrl ? [imageUrl] : [])
  const imageUrlsJson = urls.length > 0 ? JSON.stringify(urls) : null

  const isRepost = repostOfId != null && Number(repostOfId) > 0
  if (!isRepost && (!content || content.trim().length === 0)) {
    throw createError({
      statusCode: 400,
      message: '投稿内容は必須です'
    })
  }

  if (!isRepost && content.length > 500) {
    throw createError({
      statusCode: 400,
      message: '投稿内容は500文字以内で入力してください'
    })
  }

  if (!isRepost && tags.length > MAX_TAGS) {
    throw createError({
      statusCode: 400,
      message: `タグは${MAX_TAGS}個までです`
    })
  }

  const now = Date.now()
  const tagsJson = tags.length > 0 ? JSON.stringify(tags) : null

  const [inserted] = await db.insert(schema.posts).values({
    userId: user.id,
    content: isRepost ? '' : content.trim(),
    imageUrl: isRepost ? null : (urls[0] || null),
    imageUrls: isRepost ? null : imageUrlsJson,
    tags: isRepost ? null : tagsJson,
    shopId: shopId || null,
    commentToId: isRepost ? null : (commentToId || null),
    repostOfId: isRepost ? Number(repostOfId) : null,
    createdAt: now
  }).returning({ id: schema.posts.id })

  if (!inserted) {
    throw createError({ statusCode: 500, message: '投稿の保存に失敗しました' })
  }

  const [postRow] = await db.select({
    id: schema.posts.id,
    userId: schema.posts.userId,
    content: schema.posts.content,
    imageUrl: schema.posts.imageUrl,
    imageUrls: schema.posts.imageUrls,
    tags: schema.posts.tags,
    shopId: schema.posts.shopId,
    commentToId: schema.posts.commentToId,
    repostOfId: schema.posts.repostOfId,
    createdAt: schema.posts.createdAt,
    userName: schema.users.name,
    userAvatarUrl: schema.users.avatarUrl,
    userHandle: schema.users.handle,
    shopName: schema.shops.name
  })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .leftJoin(schema.shops, eq(schema.posts.shopId, schema.shops.id))
    .where(eq(schema.posts.id, inserted.id))
    .limit(1)

  const post = postRow ? {
    ...postRow,
    imageUrls: postRow.imageUrls ? (JSON.parse(postRow.imageUrls) as string[]) : (postRow.imageUrl ? [postRow.imageUrl] : []),
    tags: postRow.tags ? (JSON.parse(postRow.tags) as string[]) : [],
    userHandle: postRow.userHandle ?? undefined,
    createdAt: Number(postRow.createdAt)
  } : null

  return {
    success: true,
    post
  }
})
