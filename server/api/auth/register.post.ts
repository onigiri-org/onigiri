// アカウント作成API

import type { User } from '../../utils/auth'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
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

  const existingUser = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
  if (existingUser.length > 0) {
    throw createError({
      statusCode: 400,
      message: 'このメールアドレスは既に登録されています'
    })
  }

  const hashedPassword = await hashPassword(password)
  const now = Date.now()

  await db.insert(schema.users).values({
    id: userId,
    name,
    createdAt: now
  })

  await db.insert(schema.userCredentials).values({
    userId,
    email,
    passwordHash: hashedPassword
  })

  const { createSession } = await import('../../utils/auth')
  await createSession(event, userId)

  const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
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
