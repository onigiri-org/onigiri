// 投稿削除API

import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '投稿IDが必要です' })
  }

  const postId = Number(id)
  if (Number.isNaN(postId)) {
    throw createError({ statusCode: 400, message: '無効な投稿IDです' })
  }

  // 投稿が存在し、現在のユーザーが所有者であることを確認
  const [postRow] = await db
    .select({ id: schema.posts.id, userId: schema.posts.userId })
    .from(schema.posts)
    .where(eq(schema.posts.id, postId))
    .limit(1)

  if (!postRow) {
    throw createError({ statusCode: 404, message: '投稿が見つかりません' })
  }

  if (postRow.userId !== currentUser.id) {
    throw createError({ statusCode: 403, message: 'この投稿を削除する権限がありません' })
  }

  // 投稿を削除（関連するいいね、コメント、リポストは外部キー制約により自動的に処理される可能性があるが、
  // SQLiteの外部キー制約が有効でない場合は手動で削除する必要がある）
  // まず関連データを削除
  await db.delete(schema.likes).where(eq(schema.likes.postId, postId))
  
  // コメントを削除（再帰的にコメントのコメントも削除）
  const deleteComments = async (parentId: number) => {
    const comments = await db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.commentToId, parentId))
    
    for (const comment of comments) {
      await deleteComments(comment.id)
      await db.delete(schema.likes).where(eq(schema.likes.postId, comment.id))
      await db.delete(schema.posts).where(eq(schema.posts.id, comment.id))
    }
  }
  
  await deleteComments(postId)
  
  // リポストを削除（リポストのいいねも削除）
  const reposts = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.repostOfId, postId))
  
  for (const repost of reposts) {
    // リポストのいいねを削除
    await db.delete(schema.likes).where(eq(schema.likes.postId, repost.id))
    // リポストを削除
    await db.delete(schema.posts).where(eq(schema.posts.id, repost.id))
  }
  
  // 最後に投稿自体を削除
  await db.delete(schema.posts).where(eq(schema.posts.id, postId))

  return { success: true }
})
