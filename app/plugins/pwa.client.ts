// PWAプラグイン（クライアントサイドのみ）

export default defineNuxtPlugin(() => {
  if (process.client && 'serviceWorker' in navigator) {
    // Service Workerが登録されたら、プッシュ通知のイベントリスナーを設定
    navigator.serviceWorker.ready.then((registration) => {
      // プッシュ通知の受信処理はService Worker内で処理される
      // ここでは必要に応じてクライアント側の処理を追加
    })
  }
})
