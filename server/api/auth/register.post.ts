// アカウント作成API

import type { User } from '../../utils/auth'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  try {
    const { name, email, password } = await readBody(event)

    if (!name || !email || !password) {
      throw createError({
        statusCode: 400,
        message: '名前、メールアドレス、パスワードは必須です'
      })
    }

    if (password.length < 6) {
      throw createError({
        statusCode: 400,
        message: 'パスワードは6文字以上である必要があります'
      })
    }

    const userId = await hashEmail(email)

    // 既存ユーザーの確認
    try {
      const existingUser = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
      if (existingUser.length > 0) {
        throw createError({
          statusCode: 400,
          message: 'このメールアドレスは既に登録されています'
        })
      }
    } catch (err: any) {
      // データベースエラーの場合
      if (err.statusCode) {
        throw err
      }
      console.error('既存ユーザー確認エラー:', err)
      throw createError({
        statusCode: 500,
        message: 'データベースエラー: ' + (err.message || '既存ユーザーの確認に失敗しました')
      })
    }

    const hashedPassword = await hashPassword(password)
    const now = Date.now()

    // ユーザー作成
    try {
      await db.insert(schema.users).values({
        id: userId,
        name,
        createdAt: now
      })
    } catch (err: any) {
      console.error('ユーザー作成エラー:', err)
      throw createError({
        statusCode: 500,
        message: 'データベースエラー: ' + (err.message || 'ユーザーの作成に失敗しました')
      })
    }

    // 認証情報作成
    try {
      await db.insert(schema.userCredentials).values({
        userId,
        email,
        passwordHash: hashedPassword
      })
    } catch (err: any) {
      console.error('認証情報作成エラー:', err)
      // ユーザーは作成済みなので、ロールバックが必要な場合があります
      // ただし、Cloudflare D1ではトランザクションが制限されているため、ここではエラーを返すのみ
      throw createError({
        statusCode: 500,
        message: 'データベースエラー: ' + (err.message || '認証情報の作成に失敗しました')
      })
    }

    // セッション作成
    try {
      const { createSession } = await import('../../utils/auth')
      await createSession(event, userId)
    } catch (err: any) {
      console.error('セッション作成エラー:', err)
      throw createError({
        statusCode: 500,
        message: 'セッションの作成に失敗しました: ' + (err.message || '')
      })
    }

    // ユーザー情報取得
    try {
      const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
      if (!userRow) {
        throw createError({ statusCode: 500, message: 'ユーザー情報の取得に失敗しました' })
      }

      const user: User = {
        id: userRow.id,
        name: userRow.name,
        avatarUrl: userRow.avatarUrl ?? undefined,
        bio: userRow.bio ?? undefined,
        createdAt: Number(userRow.createdAt)
      }

      return {
        success: true,
        user
      }
    } catch (err: any) {
      console.error('ユーザー情報取得エラー:', err)
      if (err.statusCode) {
        throw err
      }
      throw createError({
        statusCode: 500,
        message: 'ユーザー情報の取得に失敗しました: ' + (err.message || '')
      })
    }
  } catch (err: any) {
    // 既にcreateErrorでラップされている場合はそのまま投げる
    if (err.statusCode) {
      throw err
    }
    // 予期しないエラーの場合
    console.error('予期しないエラー:', err)
    throw createError({
      statusCode: 500,
      message: 'アカウント作成に失敗しました: ' + (err.message || '不明なエラー')
    })
  }
})

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
