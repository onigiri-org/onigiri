// ログインAPI

import type { User } from '../../utils/auth'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      message: 'メールアドレスとパスワードは必須です'
    })
  }

  const credentials = await db.select({ userId: schema.userCredentials.userId, passwordHash: schema.userCredentials.passwordHash })
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, email))
    .limit(1)

  const cred = credentials[0]
  if (!cred) {
    throw createError({
      statusCode: 401,
      message: 'メールアドレスまたはパスワードが正しくありません'
    })
  }

  const hashedPassword = await hashPassword(password)
  if (cred.passwordHash !== hashedPassword) {
    throw createError({
      statusCode: 401,
      message: 'メールアドレスまたはパスワードが正しくありません'
    })
  }

  const { createSession } = await import('../../utils/auth')
  await createSession(event, cred.userId)

  const [userRow] = await db.select().from(schema.users).where(eq(schema.users.id, cred.userId)).limit(1)
  if (!userRow) {
    throw createError({ statusCode: 500, message: 'ユーザーが見つかりません' })
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
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
