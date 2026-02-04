// プロフィール更新API（名前・bio・アバター・handle）

import type { User } from '../../utils/auth'
import { eq } from 'drizzle-orm'

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    })
  }

  const body = await readBody(event)
  const { name, bio, avatarUrl, handle } = body as {
    name?: string
    bio?: string
    avatarUrl?: string
    handle?: string
  }

  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    const trimmed = String(name).trim()
    if (trimmed.length === 0) {
      throw createError({ statusCode: 400, message: '名前は1文字以上必要です' })
    }
    if (trimmed.length > 50) {
      throw createError({ statusCode: 400, message: '名前は50文字以内で入力してください' })
    }
    updates.name = trimmed
  }

  if (bio !== undefined) {
    updates.bio = String(bio).trim() || null
  }

  if (avatarUrl !== undefined) {
    const url = String(avatarUrl).trim()
    updates.avatarUrl = url || null
  }

  if (handle !== undefined) {
    const trimmed = String(handle).trim()
    if (trimmed.length === 0) {
      updates.handle = null
    } else {
      if (!HANDLE_REGEX.test(trimmed)) {
        throw createError({
          statusCode: 400,
          message: 'IDは3〜30文字の半角英数字・アンダースコアで入力してください'
        })
      }
      // 他ユーザーが同じhandleを使っていないか
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.handle, trimmed))
        .limit(1)
      if (existing.length > 0 && existing[0].id !== currentUser.id) {
        throw createError({
          statusCode: 400,
          message: 'このIDはすでに使われています'
        })
      }
      updates.handle = trimmed
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: '更新する項目を指定してください' })
  }

  await db
    .update(schema.users)
    .set(updates)
    .where(eq(schema.users.id, currentUser.id))

  const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, currentUser.id)).limit(1)
  const user: User & { handle?: string | null } = {
    id: userRow.id,
    name: userRow.name,
    avatarUrl: userRow.avatarUrl ?? undefined,
    bio: userRow.bio ?? undefined,
    createdAt: Number(userRow.createdAt),
    handle: userRow.handle ?? undefined
  }

  return {
    success: true,
    user
  }
})
