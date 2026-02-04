// 通知取得API（リポスト、いいね、コメント）

import { desc, eq, sql, and, inArray, isNotNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = Number(query.offset) || 0

  const notifications: any[] = []

  // 1. いいね通知（自分の投稿にいいねされたもの）
  const likedPosts = await db
    .select({
      id: schema.likes.id,
      userId: schema.likes.userId,
      postId: schema.likes.postId,
      createdAt: schema.likes.createdAt,
      userName: schema.users.name,
      userAvatarUrl: schema.users.avatarUrl,
      postContent: schema.posts.content
    })
    .from(schema.likes)
    .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
    .innerJoin(schema.users, eq(schema.likes.userId, schema.users.id))
    .where(eq(schema.posts.userId, currentUser.id))
    .orderBy(desc(schema.likes.createdAt))
    .limit(limit * 3) // 多めに取得して後でマージ

  for (const like of likedPosts) {
    notifications.push({
      type: 'like',
      id: like.id,
      userId: like.userId,
      userName: like.userName,
      userAvatarUrl: like.userAvatarUrl,
      postId: like.postId,
      postContent: like.postContent,
      createdAt: Number(like.createdAt)
    })
  }

  // 2. コメント通知（自分の投稿にコメントされたもの）
  // まず自分の投稿IDを取得
  const myPosts = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.userId, currentUser.id))
  
  const myPostIds = myPosts.map(p => p.id)
  
  if (myPostIds.length > 0) {
    const commentedPosts = await db
      .select({
        id: schema.posts.id,
        userId: schema.posts.userId,
        postId: schema.posts.commentToId,
        createdAt: schema.posts.createdAt,
        userName: schema.users.name,
        userAvatarUrl: schema.users.avatarUrl,
        commentContent: schema.posts.content
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
      .where(and(
        isNotNull(schema.posts.commentToId),
        inArray(schema.posts.commentToId, myPostIds)
      ))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit * 3)

    for (const comment of commentedPosts) {
      if (comment.postId) {
        notifications.push({
          type: 'comment',
          id: comment.id,
          userId: comment.userId,
          userName: comment.userName,
          userAvatarUrl: comment.userAvatarUrl,
          postId: comment.postId,
          postContent: comment.commentContent, // コメント内容を表示
          createdAt: Number(comment.createdAt)
        })
      }
    }
  }

  // 3. リポスト通知（自分の投稿がリポストされたもの）
  if (myPostIds.length > 0) {
    const repostedPosts = await db
      .select({
        id: schema.posts.id,
        userId: schema.posts.userId,
        postId: schema.posts.repostOfId,
        createdAt: schema.posts.createdAt,
        userName: schema.users.name,
        userAvatarUrl: schema.users.avatarUrl
      })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
      .where(and(
        isNotNull(schema.posts.repostOfId),
        inArray(schema.posts.repostOfId, myPostIds),
        sql`${schema.posts.content} = ''`
      ))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit * 3)

    // 元投稿の内容を取得
    for (const repost of repostedPosts) {
      if (repost.postId) {
        const [originalPost] = await db
          .select({ content: schema.posts.content })
          .from(schema.posts)
          .where(eq(schema.posts.id, repost.postId))
          .limit(1)

        notifications.push({
          type: 'repost',
          id: repost.id,
          userId: repost.userId,
          userName: repost.userName,
          userAvatarUrl: repost.userAvatarUrl,
          postId: repost.postId,
          postContent: originalPost?.content || '',
          createdAt: Number(repost.createdAt)
        })
      }
    }
  }

  // 日時でソートして、重複を除去（同じユーザーが同じ投稿に複数回いいね/コメント/リポストした場合、最新のもののみ）
  const notificationMap = new Map<string, any>()
  for (const notification of notifications) {
    const key = `${notification.type}-${notification.userId}-${notification.postId}`
    const existing = notificationMap.get(key)
    if (!existing || notification.createdAt > existing.createdAt) {
      notificationMap.set(key, notification)
    }
  }

  const sortedNotifications = Array.from(notificationMap.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(offset, offset + limit)

  return {
    notifications: sortedNotifications,
    total: notificationMap.size
  }
})
