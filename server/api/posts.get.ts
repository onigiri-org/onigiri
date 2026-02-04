// タイムライン取得API

import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

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
  const { getUserFromSession } = await import('../utils/auth')
  const currentUser = await getUserFromSession(event)

  const query = getQuery(event)
  const tag = typeof query.tag === 'string' ? query.tag.trim() : null
  // 複数タグでのAND検索（カンマ区切りまたは配列）
  const tagsParam = query.tags
  let tags: string[] = []
  if (tagsParam) {
    if (Array.isArray(tagsParam)) {
      tags = tagsParam.filter((t): t is string => typeof t === 'string').map(t => t.trim()).filter(Boolean)
    } else if (typeof tagsParam === 'string') {
      tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean)
    }
  }
  // 後方互換性のため、単一tagパラメータもサポート
  if (tag && !tags.length) {
    tags = [tag]
  }
  
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const conditions = [
    isNull(schema.posts.commentToId)
  ]

  // ログイン中: タイムラインは自分＋フォロー中のユーザーの投稿のみ
  if (currentUser) {
    const followRows = await db
      .select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, currentUser.id))
    const allowedUserIds = [currentUser.id, ...followRows.map(r => r.followingId)]
    conditions.push(inArray(schema.posts.userId, allowedUserIds))
  } else {
    // 未ログイン時は投稿なし（フォロータイムラインのため）
    return { posts: [], total: 0 }
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
    .where(and(...conditions))
    .orderBy(desc(schema.posts.createdAt))
    .limit(limit)
    .offset(offset)

  let likedPostIds = new Set<number>()
  let repostedPostIds = new Set<number>()
  let followedUserIds = new Set<string>()
  if (currentUser && postRows.length > 0) {
    const ids = [...postRows.map(r => r.id), ...postRows.filter(r => r.repostOfId != null).map(r => r.repostOfId!)]
    const uniqueIds = [...new Set(ids)]
    const liked = await db
      .select({ postId: schema.likes.postId })
      .from(schema.likes)
      .where(and(
        eq(schema.likes.userId, currentUser.id),
        inArray(schema.likes.postId, uniqueIds)
      ))
    likedPostIds = new Set(liked.map(r => r.postId))

    // 現在のユーザーがリポストした投稿IDを取得
    const repostedPosts = await db
      .select({ repostOfId: schema.posts.repostOfId })
      .from(schema.posts)
      .where(and(
        eq(schema.posts.userId, currentUser.id),
        sql`${schema.posts.repostOfId} IS NOT NULL`,
        inArray(schema.posts.repostOfId, uniqueIds)
      ))
    repostedPostIds = new Set(repostedPosts.map(r => r.repostOfId!).filter(Boolean))

    const authorIds = [...new Set(postRows.map(r => r.userId))]
    const followRels = await db
      .select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, currentUser.id),
        inArray(schema.follows.followingId, authorIds)
      ))
    followedUserIds = new Set(followRels.map(r => r.followingId))
  }

  const repostOfIds = [...new Set(postRows.filter(r => r.repostOfId != null).map(r => r.repostOfId!))]
  let originalPostsMap = new Map<number, any>()
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
        repostCount: Number(r.repostCount ?? 0)
      })
    }
  }

  let posts = postRows.map((row) => {
    const isRepost = row.repostOfId != null
    const originalPost = isRepost ? originalPostsMap.get(row.repostOfId!) : undefined
    const postIdToCheck = isRepost && originalPost ? originalPost.id : row.id
    return {
      ...row,
      imageUrls: parseImageUrls(row.imageUrls, row.imageUrl),
      tags: parseTagsJson(row.tags),
      userHandle: row.userHandle ?? undefined,
      createdAt: Number(row.createdAt),
      likeCount: isRepost && originalPost ? originalPost.likeCount : Number(row.likeCount ?? 0),
      commentCount: isRepost && originalPost ? originalPost.commentCount : Number(row.commentCount ?? 0),
      repostCount: isRepost && originalPost ? originalPost.repostCount : Number(row.repostCount ?? 0),
      likedByMe: isRepost && originalPost ? likedPostIds.has(originalPost.id) : likedPostIds.has(row.id),
      repostedByMe: repostedPostIds.has(postIdToCheck),
      followedByMe: followedUserIds.has(row.userId),
      originalPost: isRepost && originalPost ? { ...originalPost, likedByMe: likedPostIds.has(originalPost.id), repostedByMe: repostedPostIds.has(originalPost.id) } : undefined
    }
  })

  // タグでフィルタリング（JavaScriptで処理）
  if (tags.length > 0) {
    console.log('Filtering posts by tags:', tags)
    posts = posts.filter(post => {
      const postTags = post.tags || []
      // すべてのタグが含まれている必要がある（AND検索）
      return tags.every(tag => postTags.includes(tag))
    })
    console.log('Filtered posts count:', posts.length)
  }

  return {
    posts,
    total: posts.length
  }
})
