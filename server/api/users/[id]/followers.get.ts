// フォロワー一覧取得API

import { and, eq, inArray, or } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../../utils/auth')
  const currentUser = await getUserFromSession(event)

  const identifier = getRouterParam(event, 'id')
  if (!identifier) {
    throw createError({ statusCode: 400, message: 'ユーザーIDが必要です' })
  }

  const [userRow] = await db
    .select({ id: schema.users.id })
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
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  // フォロワーのユーザーID一覧を取得
  const followRows = await db
    .select({ followerId: schema.follows.followerId })
    .from(schema.follows)
    .where(eq(schema.follows.followingId, userRow.id))
    .limit(limit)
    .offset(offset)

  const followerIds = followRows.map(r => r.followerId)
  if (followerIds.length === 0) {
    return { users: [] }
  }

  // フォロワーのユーザー情報を取得
  const users = await db
    .select({
      id: schema.users.id,
      handle: schema.users.handle,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      bio: schema.users.bio,
      createdAt: schema.users.createdAt
    })
    .from(schema.users)
    .where(inArray(schema.users.id, followerIds))

  // 現在のユーザーがフォローしているかチェック
  let followedUserIds = new Set<string>()
  if (currentUser && users.length > 0) {
    const followRels = await db
      .select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, currentUser.id),
        inArray(schema.follows.followingId, followerIds)
      ))
    followedUserIds = new Set(followRels.map(r => r.followingId))
  }

  return {
    users: users.map(u => ({
      id: u.id,
      handle: u.handle ?? undefined,
      name: u.name,
      avatarUrl: u.avatarUrl ?? undefined,
      bio: u.bio ?? undefined,
      createdAt: Number(u.createdAt),
      followedByMe: followedUserIds.has(u.id)
    }))
  }
})
