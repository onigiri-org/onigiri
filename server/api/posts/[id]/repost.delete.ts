// リポスト解除API

import { and, eq, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../../utils/auth')
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

  // 現在のユーザーがこの投稿をリポストしているか確認
  const [repostRow] = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(and(
      eq(schema.posts.userId, currentUser.id),
      eq(schema.posts.repostOfId, postId),
      sql`${schema.posts.content} = ''`
    ))
    .limit(1)

  if (!repostRow) {
    throw createError({ statusCode: 404, message: 'リポストが見つかりません' })
  }

  // リポストを削除
  await db
    .delete(schema.posts)
    .where(eq(schema.posts.id, repostRow.id))

  return { success: true, reposted: false }
})
