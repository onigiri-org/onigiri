// フォロー解除

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

  await db
    .delete(schema.follows)
    .where(and(
      eq(schema.follows.followerId, currentUser.id),
      eq(schema.follows.followingId, targetUser.id)
    ))

  return { success: true, following: false }
})
