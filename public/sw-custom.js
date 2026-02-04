// Service Worker（@vite-pwa/nuxtが自動生成するService Workerに追加される処理）

// プッシュ通知の受信処理
self.addEventListener('push', (event) => {
  let data = {}
  
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { title: event.data.text() }
    }
  }

  const title = data.title || 'おにぎり'
  const options = {
    body: data.body || '新しい通知があります',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'default',
    data: data.data || {},
    ...data.options
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data
  const urlToOpen = data.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているウィンドウがあればそこにフォーカス
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
