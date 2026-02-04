// 認証ユーティリティ関数（kv / db は NuxtHub により auto-import）

import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

export interface User {
  id: string
  handle?: string | null
  name: string
  avatarUrl?: string
  bio?: string
  createdAt: number
}

// セッションからユーザーIDを取得
export async function getUserIdFromSession(event: H3Event): Promise<string | null> {
  const session = await getCookie(event, 'session')
  if (!session) return null

  const userId = await kv.get(`session:${session}`)
  return userId ? String(userId) : null
}

// セッションからユーザー情報を取得
export async function getUserFromSession(event: H3Event): Promise<User | null> {
  const userId = await getUserIdFromSession(event)
  if (!userId) return null

  const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  const row = rows[0]
  if (!row) return null

  return {
    id: row.id,
    handle: row.handle ?? undefined,
    name: row.name,
    avatarUrl: row.avatarUrl ?? undefined,
    bio: row.bio ?? undefined,
    createdAt: Number(row.createdAt)
  }
}

// セッションを作成
export async function createSession(event: H3Event, userId: string): Promise<string> {
  const sessionId = crypto.randomUUID()

  await kv.set(`session:${sessionId}`, userId, { ttl: 60 * 60 * 24 * 7 })

  setCookie(event, 'session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })

  return sessionId
}

// セッションを削除（ログアウト）
export async function deleteSession(event: H3Event): Promise<void> {
  const session = await getCookie(event, 'session')
  if (session) {
    await kv.del(`session:${session}`)
    setCookie(event, 'session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    })
  }
}
