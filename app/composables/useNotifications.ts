// 通知の既読状態を管理するcomposable

export const useNotifications = () => {
  const STORAGE_KEY = 'read-notifications'

  // 既読通知IDのセットを取得
  const getReadNotificationIds = (): Set<string> => {
    if (process.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[]
          return new Set(ids)
        } catch {
          return new Set()
        }
      }
    }
    return new Set()
  }

  // 通知を既読にする
  const markAsRead = (notificationId: string) => {
    if (!process.client) return
    
    const readIds = getReadNotificationIds()
    readIds.add(notificationId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)))
  }

  // 複数の通知を既読にする
  const markMultipleAsRead = (notificationIds: string[]) => {
    if (!process.client) return
    
    const readIds = getReadNotificationIds()
    notificationIds.forEach(id => readIds.add(id))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)))
  }

  // 未読通知数を計算
  const getUnreadCount = (notifications: Array<{ type: string; id: number; userId: string; postId: number }>): number => {
    if (!process.client) return 0
    
    const readIds = getReadNotificationIds()
    return notifications.filter(notif => {
      const key = `${notif.type}-${notif.userId}-${notif.postId}`
      return !readIds.has(key)
    }).length
  }

  // 全ての通知を既読にする
  const markAllAsRead = (notifications: Array<{ type: string; id: number; userId: string; postId: number }>) => {
    if (!process.client) return
    
    const keys = notifications.map(notif => `${notif.type}-${notif.userId}-${notif.postId}`)
    markMultipleAsRead(keys)
  }

  return {
    getReadNotificationIds,
    markAsRead,
    markMultipleAsRead,
    getUnreadCount,
    markAllAsRead
  }
}
