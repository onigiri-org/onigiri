// プッシュ通知の購読API

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  const body = await readBody(event)
  const { subscription } = body

  if (!subscription || !subscription.endpoint) {
    throw createError({ statusCode: 400, message: '無効な購読情報です' })
  }

  // KVストレージに購読情報を保存（kvはNuxtHubによりauto-import）
  const subscriptionKey = `push_subscription:${currentUser.id}`
  await kv.set(subscriptionKey, JSON.stringify({
    userId: currentUser.id,
    subscription,
    createdAt: Date.now()
  }))

  return { success: true }
})
