// 認証ユーティリティ関数（kv / db は NuxtHub により auto-import）

import type { H3Event } from 'h3'
import { createError } from 'h3'
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

  try {
    const userId = await kv.get(`session:${session}`)
    return userId ? String(userId) : null
  } catch (error: any) {
    console.error('KV get error:', error)
    return null
  }
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

  try {
    await kv.set(`session:${sessionId}`, userId, { ttl: 60 * 60 * 24 * 7 })
  } catch (error: any) {
    console.error('KV set error:', error)
    throw createError({
      statusCode: 500,
      message: 'セッションの作成に失敗しました: ' + (error.message || 'KVストレージエラー')
    })
  }

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
    try {
      await kv.del(`session:${session}`)
    } catch (error: any) {
      console.error('KV del error:', error)
      // エラーが発生してもクッキーは削除する
    }
    setCookie(event, 'session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0
    })
  }
}
