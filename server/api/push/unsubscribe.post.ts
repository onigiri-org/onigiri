// プッシュ通知の購読解除API

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  // KVストレージから購読情報を削除（kvはNuxtHubによりauto-import）
  const subscriptionKey = `push_subscription:${currentUser.id}`
  await kv.del(subscriptionKey)

  return { success: true }
})
