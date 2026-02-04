// ユーザー詳細取得API（handle または id で取得、プロフィール＋自分の投稿一覧）

import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  const identifier = getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'ユーザーIDが必要です' })
  }

  // handle または id でユーザーを取得
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

  const [followCountRows, followerCountRows] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.follows).where(eq(schema.follows.followerId, userRow.id)),
    db.select({ n: sql<number>`COUNT(*)` }).from(schema.follows).where(eq(schema.follows.followingId, userRow.id))
  ])
  const followCount = Number(followCountRows[0]?.n ?? 0)
  const followerCount = Number(followerCountRows[0]?.n ?? 0)

  let followedByMe = false
  if (currentUser && currentUser.id !== userRow.id) {
    const [followRel] = await db
      .select()
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, currentUser.id),
        eq(schema.follows.followingId, userRow.id)
      ))
      .limit(1)
    followedByMe = !!followRel
  }

  const user = {
    id: userRow.id,
    handle: userRow.handle ?? undefined,
    name: userRow.name,
    avatarUrl: userRow.avatarUrl ?? undefined,
    bio: userRow.bio ?? undefined,
    createdAt: Number(userRow.createdAt),
    followCount,
    followerCount,
    followedByMe
  }

  // 自分の投稿一覧（userId は内部 id でフィルタ）
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = Number(query.offset) || 0

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
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
    .leftJoin(schema.shops, eq(schema.posts.shopId, schema.shops.id))
    .where(and(
      eq(schema.posts.userId, userRow.id),
      isNull(schema.posts.commentToId)
    ))
    .orderBy(desc(schema.posts.createdAt))
    .limit(limit)
    .offset(offset)

  let likedPostIds = new Set<number>()
  let repostedPostIds = new Set<number>()
  if (currentUser && postRows.length > 0) {
    const ids = [...postRows.map(r => r.id), ...postRows.filter(r => r.repostOfId != null).map(r => r.repostOfId!)]
    const uniqueIds = [...new Set(ids)]
    const [liked, reposted] = await Promise.all([
      db.select({ postId: schema.likes.postId }).from(schema.likes).where(and(
        eq(schema.likes.userId, currentUser.id),
        inArray(schema.likes.postId, uniqueIds)
      )),
      db.select({ repostOfId: schema.posts.repostOfId }).from(schema.posts).where(and(
        eq(schema.posts.userId, currentUser.id),
        sql`${schema.posts.repostOfId} IS NOT NULL`,
        inArray(schema.posts.repostOfId, uniqueIds)
      ))
    ])
    likedPostIds = new Set(liked.map(r => r.postId))
    repostedPostIds = new Set(reposted.map(r => r.repostOfId!).filter(Boolean))
  }

  const repostOfIds = [...new Set(postRows.filter(r => r.repostOfId != null).map(r => r.repostOfId!))]
  let originalPostsMap = new Map<number, Record<string, unknown>>()
  if (repostOfIds.length > 0) {
    const originalRows = await db
      .select({
        id: schema.posts.id,
        userId: schema.posts.userId,
        content: schema.posts.content,
        imageUrl: schema.posts.imageUrl,
        imageUrls: schema.posts.imageUrls,
        tags: schema.posts.tags,
        createdAt: schema.posts.createdAt,
        userName: schema.users.name,
        userAvatarUrl: schema.users.avatarUrl,
        userHandle: schema.users.handle,
        likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.postId = ${schema.posts.id})`.as('likeCount'),
        commentCount: sql<number>`(SELECT COUNT(*) FROM posts AS p2 WHERE p2.commentToId = ${schema.posts.id})`.as('commentCount'),
        repostCount: sql<number>`(SELECT COUNT(*) FROM posts AS p3 WHERE p3.repostOfId = ${schema.posts.id})`.as('repostCount')
      })
      .from(schema.posts)
      .leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
      .where(inArray(schema.posts.id, repostOfIds))
    for (const r of originalRows) {
      originalPostsMap.set(r.id, {
        id: r.id,
        userId: r.userId,
        content: r.content,
        imageUrl: r.imageUrl,
        imageUrls: parseImageUrls(r.imageUrls, r.imageUrl),
        tags: parseTagsJson(r.tags),
        createdAt: Number(r.createdAt),
        userName: r.userName,
        userAvatarUrl: r.userAvatarUrl ?? undefined,
        userHandle: r.userHandle ?? undefined,
        likeCount: Number(r.likeCount ?? 0),
        commentCount: Number(r.commentCount ?? 0),
        repostCount: Number(r.repostCount ?? 0),
        repostedByMe: repostedPostIds.has(r.id)
      })
    }
  }

  const posts = postRows.map((row) => {
    const isRepost = row.repostOfId != null
    const originalPost = isRepost ? originalPostsMap.get(row.repostOfId!) : undefined
    const postIdToCheck = isRepost && originalPost ? originalPost.id as number : row.id
    return {
      ...row,
      imageUrls: parseImageUrls(row.imageUrls, row.imageUrl),
      tags: parseTagsJson(row.tags),
      userHandle: row.userHandle ?? undefined,
      createdAt: Number(row.createdAt),
      likeCount: isRepost && originalPost ? (originalPost.likeCount as number) : Number(row.likeCount ?? 0),
      commentCount: isRepost && originalPost ? (originalPost.commentCount as number) : Number(row.commentCount ?? 0),
      repostCount: isRepost && originalPost ? (originalPost.repostCount as number) : Number(row.repostCount ?? 0),
      likedByMe: isRepost && originalPost ? likedPostIds.has(originalPost.id as number) : likedPostIds.has(row.id),
      repostedByMe: repostedPostIds.has(postIdToCheck),
      followedByMe, // このユーザー（プロフィール）をフォロー済みか
      originalPost: isRepost && originalPost ? { ...originalPost, likedByMe: likedPostIds.has(originalPost.id as number), repostedByMe: repostedPostIds.has(originalPost.id as number) } : undefined
    }
  })

  return {
    user,
    posts
  }
})
