// ユーザーがいいねした投稿一覧

import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'

function parseTagsJson(tags: string | null): string[] {
  if (!tags) return []
  try {
    const arr = JSON.parse(tags) as unknown
    return Array.isArray(arr) ? arr.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

function parseImageUrls(imageUrls: string | null, imageUrl: string | null): string[] {
  if (imageUrls) {
    try {
      const arr = JSON.parse(imageUrls) as unknown
      if (Array.isArray(arr)) return arr.filter((u): u is string => typeof u === 'string')
    } catch { /* ignore */ }
  }
  return imageUrl ? [imageUrl] : []
}

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../../utils/auth')
  const currentUser = await getUserFromSession(event)

  const identifier = getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'ユーザーIDが必要です' })
  }

  const [userRow] = await db
    .select()
    .from(schema.users)
    .where(or(
      eq(schema.users.handle, identifier),
      eq(schema.users.id, identifier)
    ))
    .limit(1)

  if (!userRow) {
    throw createError({ statusCode: 404, message: 'ユーザーが見つかりません' })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = Number(query.offset) || 0

  const postRows = await db
    .select({
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
      shopName: schema.shops.name,
      shopAddress: schema.shops.address,
      likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.postId = ${schema.posts.id})`.as('likeCount'),
      commentCount: sql<number>`(SELECT COUNT(*) FROM posts AS p2 WHERE p2.commentToId = ${schema.posts.id})`.as('commentCount'),
      repostCount: sql<number>`(SELECT COUNT(*) FROM posts AS p3 WHERE p3.repostOfId = ${schema.posts.id})`.as('repostCount')
    })
    .from(schema.likes)
    .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .leftJoin(schema.shops, eq(schema.posts.shopId, schema.shops.id))
    .where(and(
      eq(schema.likes.userId, userRow.id),
      isNull(schema.posts.commentToId),
      isNull(schema.posts.repostOfId)
    ))
    .orderBy(desc(schema.likes.createdAt))
    .limit(limit)
    .offset(offset)

  let likedPostIds = new Set<number>()
  let repostedPostIds = new Set<number>()
  if (currentUser && postRows.length > 0) {
    const ids = postRows.map(r => r.id)
    const [liked, reposted] = await Promise.all([
      db.select({ postId: schema.likes.postId }).from(schema.likes).where(and(
        eq(schema.likes.userId, currentUser.id),
        inArray(schema.likes.postId, ids)
      )),
      db.select({ repostOfId: schema.posts.repostOfId }).from(schema.posts).where(and(
        eq(schema.posts.userId, currentUser.id),
        sql`${schema.posts.repostOfId} IS NOT NULL`,
        inArray(schema.posts.repostOfId, ids)
      ))
    ])
    likedPostIds = new Set(liked.map(r => r.postId))
    repostedPostIds = new Set(reposted.map(r => r.repostOfId!).filter(Boolean))
  }

  const posts = postRows.map((row) => ({
    ...row,
    imageUrls: parseImageUrls(row.imageUrls, row.imageUrl),
    tags: parseTagsJson(row.tags),
    userHandle: row.userHandle ?? undefined,
    createdAt: Number(row.createdAt),
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    likedByMe: likedPostIds.has(row.id),
    repostedByMe: repostedPostIds.has(row.id)
  }))

  return {
    posts
  }
})
