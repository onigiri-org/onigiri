// 現在のユーザー情報を取得するAPI

import type { User } from '../../utils/auth'

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    })
  }

  return {
    user
  }
})
