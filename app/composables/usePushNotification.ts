// プッシュ通知用のcomposable

export const usePushNotification = () => {
  const { user } = useAuth()

  // 通知許可をリクエスト
  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      throw new Error('このブラウザは通知をサポートしていません')
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission === 'denied') {
      throw new Error('通知が拒否されています。ブラウザの設定から許可してください。')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  // プッシュ通知の購読を開始
  const subscribeToPush = async (): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('このブラウザはプッシュ通知をサポートしていません')
    }

    const registration = await navigator.serviceWorker.ready

    // VAPID公開鍵を取得（実際の実装では環境変数から取得）
    const vapidPublicKey = useRuntimeConfig().public.vapidPublicKey

    if (!vapidPublicKey) {
      console.warn('VAPID公開鍵が設定されていません')
      return null
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      })

      // サーバーに購読情報を送信
      await $fetch('/api/push/subscribe', {
        method: 'POST',
        body: {
          subscription: subscription.toJSON()
        }
      })

      return subscription
    } catch (err) {
      console.error('プッシュ通知の購読に失敗しました:', err)
      throw err
    }
  }

  // プッシュ通知の購読を解除
  const unsubscribeFromPush = async (): Promise<void> => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // サーバーに購読解除を通知
      await $fetch('/api/push/unsubscribe', {
        method: 'POST',
        body: {
          subscription: subscription.toJSON()
        }
      })
    }
  }

  // ローカル通知を表示
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, options)
    }
  }

  // VAPID公開鍵をUint8Arrayに変換
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  return {
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showNotification
  }
}
