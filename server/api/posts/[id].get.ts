// 投稿詳細取得API（1件＋コメント一覧）

import { and, desc, eq, inArray, sql } from 'drizzle-orm'

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
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '投稿IDが必要です' })
  }

  const postId = Number(id)
  if (Number.isNaN(postId)) {
    throw createError({ statusCode: 400, message: '無効な投稿IDです' })
  }

  // メイン投稿を取得
  const [mainRow] = await db
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
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .leftJoin(schema.shops, eq(schema.posts.shopId, schema.shops.id))
    .where(eq(schema.posts.id, postId))
    .limit(1)

  if (!mainRow) {
    throw createError({ statusCode: 404, message: '投稿が見つかりません' })
  }

  // コメント一覧を取得
  const commentRows = await db
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
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .leftJoin(schema.shops, eq(schema.posts.shopId, schema.shops.id))
    .where(eq(schema.posts.commentToId, postId))
    .orderBy(desc(schema.posts.createdAt))

  const allPostIds = [mainRow.id, ...commentRows.map(r => r.id)]
  const authorIds = [mainRow.userId, ...commentRows.map(r => r.userId)]
  let likedPostIds = new Set<number>()
  let repostedPostIds = new Set<number>()
  let followedUserIds = new Set<string>()
  if (currentUser && allPostIds.length > 0) {
    const [liked, reposted, followRels] = await Promise.all([
      db.select({ postId: schema.likes.postId }).from(schema.likes).where(and(eq(schema.likes.userId, currentUser.id), inArray(schema.likes.postId, allPostIds))),
      db.select({ repostOfId: schema.posts.repostOfId }).from(schema.posts).where(and(eq(schema.posts.userId, currentUser.id), sql`${schema.posts.repostOfId} IS NOT NULL`, inArray(schema.posts.repostOfId, allPostIds))),
      db.select({ followingId: schema.follows.followingId }).from(schema.follows).where(and(eq(schema.follows.followerId, currentUser.id), inArray(schema.follows.followingId, [...new Set(authorIds)])))
    ])
    likedPostIds = new Set(liked.map(r => r.postId))
    repostedPostIds = new Set(reposted.map(r => r.repostOfId!).filter(Boolean))
    followedUserIds = new Set(followRels.map(r => r.followingId))
  }

  const post = {
    ...mainRow,
    imageUrls: parseImageUrls(mainRow.imageUrls, mainRow.imageUrl),
    tags: parseTagsJson(mainRow.tags),
    userHandle: mainRow.userHandle ?? undefined,
    createdAt: Number(mainRow.createdAt),
    likeCount: Number(mainRow.likeCount ?? 0),
    commentCount: Number(mainRow.commentCount ?? 0),
    repostCount: Number(mainRow.repostCount ?? 0),
    likedByMe: likedPostIds.has(mainRow.id),
    repostedByMe: repostedPostIds.has(mainRow.id),
    followedByMe: followedUserIds.has(mainRow.userId)
  }

  const comments = commentRows.map((row) => ({
    ...row,
    imageUrls: parseImageUrls(row.imageUrls, row.imageUrl),
    tags: parseTagsJson(row.tags),
    userHandle: row.userHandle ?? undefined,
    createdAt: Number(row.createdAt),
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    likedByMe: likedPostIds.has(row.id),
    repostedByMe: repostedPostIds.has(row.id),
    followedByMe: followedUserIds.has(row.userId)
  }))

  return {
    post,
    comments
  }
})
