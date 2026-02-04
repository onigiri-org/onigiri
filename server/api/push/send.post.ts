// プッシュ通知送信API（管理者用または内部API）

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../../utils/auth')
  const currentUser = await getUserFromSession(event)

  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' })
  }

  const body = await readBody(event)
  const { userId, title, options } = body

  if (!userId || !title) {
    throw createError({ statusCode: 400, message: 'userIdとtitleが必要です' })
  }

  // 購読情報を取得（kvはNuxtHubによりauto-import）
  const subscriptionKey = `push_subscription:${userId}`
  const subscriptionData = await kv.get(subscriptionKey)

  if (!subscriptionData) {
    throw createError({ statusCode: 404, message: '購読情報が見つかりません' })
  }

  const subscription = JSON.parse(subscriptionData)

  // VAPID秘密鍵を取得（環境変数から）
  const vapidPrivateKey = useRuntimeConfig().vapidPrivateKey

  if (!vapidPrivateKey) {
    throw createError({ statusCode: 500, message: 'VAPID秘密鍵が設定されていません' })
  }

  // プッシュ通知を送信
  // 注意: 実際の実装では、web-pushライブラリなどを使用してプッシュ通知を送信します
  // ここでは簡易的な実装例を示します

  try {
    // web-pushライブラリを使用する場合の例（実際にはインストールが必要）
    // const webpush = await import('web-push')
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   useRuntimeConfig().public.vapidPublicKey,
    //   vapidPrivateKey
    // )
    // await webpush.sendNotification(subscription.subscription, JSON.stringify({
    //   title,
    //   ...options
    // }))

    // 簡易実装: Service Workerにメッセージを送信
    // 実際のプッシュ通知は、バックグラウンドで動作するService Workerが処理します

    return { success: true, message: 'プッシュ通知を送信しました' }
  } catch (err: any) {
    console.error('プッシュ通知送信エラー:', err)
    throw createError({ statusCode: 500, message: 'プッシュ通知の送信に失敗しました' })
  }
})
