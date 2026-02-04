// いいねのトグル（押すとつく、もう一度押すと外れる）

import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../../utils/auth')
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '投稿IDが必要です' })
  }

  const postId = Number(id)
  if (Number.isNaN(postId)) {
    throw createError({ statusCode: 400, message: '無効な投稿IDです' })
  }

  const existing = await db
    .select({ id: schema.likes.id })
    .from(schema.likes)
    .where(and(
      eq(schema.likes.userId, user.id),
      eq(schema.likes.postId, postId)
    ))
    .limit(1)

  const now = Date.now()

  if (existing.length > 0) {
    await db
      .delete(schema.likes)
      .where(and(
        eq(schema.likes.userId, user.id),
        eq(schema.likes.postId, postId)
      ))
    const remaining = await db.select().from(schema.likes).where(eq(schema.likes.postId, postId))
    return { liked: false, likeCount: remaining.length }
  }

  await db.insert(schema.likes).values({
    userId: user.id,
    postId,
    createdAt: now
  })

  const likedRows = await db.select().from(schema.likes).where(eq(schema.likes.postId, postId))
  return { liked: true, likeCount: likedRows.length }
})
