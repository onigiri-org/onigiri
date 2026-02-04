// フォローする

import { and, eq, or } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  const identifier = getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'ユーザーIDが必要です' })
  }

  const [targetUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(or(
      eq(schema.users.handle, identifier),
      eq(schema.users.id, identifier)
    ))
    .limit(1)

  if (!targetUser) {
    throw createError({ statusCode: 404, message: 'ユーザーが見つかりません' })
  }

  if (targetUser.id === currentUser.id) {
    throw createError({ statusCode: 400, message: '自分自身はフォローできません' })
  }

  const [existing] = await db
    .select()
    .from(schema.follows)
    .where(and(
      eq(schema.follows.followerId, currentUser.id),
      eq(schema.follows.followingId, targetUser.id)
    ))
    .limit(1)

  if (!existing) {
    const now = Date.now()
    await db.insert(schema.follows).values({
      followerId: currentUser.id,
      followingId: targetUser.id,
      createdAt: now
    })
  }

  return { success: true, following: true }
})
