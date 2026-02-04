<template>
  <UContainer class="max-w-4xl py-6">
    <div class="space-y-6">
      <!-- 戻るリンク -->
      <div>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-arrow-left"
          to="/"
        >
          タイムラインに戻る
        </UButton>
      </div>

      <!-- ヘッダー -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-bell" class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-bold">通知</h1>
      </div>

      <!-- 読み込み中 -->
      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- エラー -->
      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        :title="errorMessage"
        class="my-8"
      />

      <!-- 通知がない場合 -->
      <div v-else-if="notifications.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        通知はまだありません
      </div>

      <!-- 通知一覧 -->
      <div v-else class="space-y-2">
        <div
          v-for="notification in notifications"
          :key="`${notification.type}-${notification.id}`"
          class="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          @click="navigateToNotification(notification)"
        >
          <div class="flex items-start gap-3">
            <!-- アイコン -->
            <div class="flex-shrink-0">
              <UIcon
                :name="getNotificationIcon(notification.type)"
                class="w-5 h-5"
                :class="getNotificationIconColor(notification.type)"
              />
            </div>

            <!-- 通知内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UAvatar
                  :src="notification.userAvatarUrl?.trim() || undefined"
                  :alt="notification.userName"
                  :text="(notification.userName && notification.userName.charAt(0)) ? notification.userName.charAt(0).toUpperCase() : '?'"
                  size="sm"
                  class="flex-shrink-0"
                />
                <span class="font-medium text-sm">{{ notification.userName }}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ getNotificationText(notification.type) }}
                </span>
              </div>
              
              <!-- 投稿のプレビュー -->
              <div v-if="notification.postContent" class="mt-2">
                <div class="p-2 bg-gray-50 dark:bg-gray-800/30 rounded text-sm text-gray-600 dark:text-gray-400 line-clamp-2" v-html="linkifyText(notification.postContent)"></div>
                <!-- OGPカード -->
                <OgpCard
                  v-for="(url, index) in extractUrls(notification.postContent)"
                  :key="`ogp-${notification.id}-${index}`"
                  :url="url"
                  class="mt-2"
                />
              </div>
              
              <div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {{ formatDate(notification.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 無限スクロール用のセンチネル -->
      <div
        v-if="notifications.length > 0 && !loadingMore"
        ref="sentinelRef"
        class="h-1"
      />
      
      <!-- 読み込み中表示 -->
      <div v-if="loadingMore" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
interface Notification {
  type: 'like' | 'comment' | 'repost'
  id: number
  userId: string
  userName: string
  userAvatarUrl?: string
  postId: number
  postContent?: string // コメントの場合はコメント内容、それ以外は投稿内容
  createdAt: number
}

const offset = ref(0)
const limit = 20

const { data, pending, error, refresh } = await useFetch('/api/notifications', {
  query: computed(() => ({
    limit,
    offset: 0
  }))
})

const notifications = ref<Notification[]>([])
const loadingMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const hasMore = ref(true)

watch(data, () => {
  if (data.value) {
    notifications.value = data.value.notifications || []
    offset.value = notifications.value.length
    hasMore.value = (data.value.notifications || []).length === limit
  }
}, { immediate: true })

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  try {
    const response = await $fetch<{ notifications: Notification[] }>('/api/notifications', {
      query: {
        limit,
        offset: offset.value
      }
    })
    if (response.notifications?.length > 0) {
      notifications.value.push(...response.notifications)
      offset.value += response.notifications.length
      hasMore.value = response.notifications.length === limit
    } else {
      hasMore.value = false
    }
  } catch (err) {
    console.error('通知の読み込みエラー:', err)
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

// Intersection Observerで無限スクロール
onMounted(() => {
  if (!sentinelRef.value) return
  
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value) {
        loadMore()
      }
    },
    { rootMargin: '100px' }
  )
  
  watch(sentinelRef, (newRef) => {
    if (newRef) {
      observer.observe(newRef)
    }
  }, { immediate: true })
  
  onUnmounted(() => {
    if (sentinelRef.value) {
      observer.unobserve(sentinelRef.value)
    }
    observer.disconnect()
  })
})

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return 'i-lucide-star'
    case 'comment':
      return 'i-lucide-message-circle'
    case 'repost':
      return 'i-lucide-repeat'
    default:
      return 'i-lucide-bell'
  }
}

const getNotificationIconColor = (type: string) => {
  switch (type) {
    case 'like':
      return 'text-primary'
    case 'comment':
      return 'text-blue-500'
    case 'repost':
      return 'text-green-500'
    default:
      return 'text-gray-500'
  }
}

const getNotificationText = (type: string) => {
  switch (type) {
    case 'like':
      return 'があなたの投稿にいいねしました'
    case 'comment':
      return 'があなたの投稿にコメントしました'
    case 'repost':
      return 'があなたの投稿をリポストしました'
    default:
      return ''
  }
}

const { markAsRead } = useNotifications()

const navigateToNotification = (notification: Notification) => {
  // 通知を既読にする
  const notificationKey = `${notification.type}-${notification.userId}-${notification.postId}`
  markAsRead(notificationKey)
  
  // 親レイアウトの未読数を更新するためにイベントを発行
  if (process.client) {
    window.dispatchEvent(new CustomEvent('notification-read'))
  }
  
  navigateTo(`/posts/${notification.postId}`)
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  if (hours < 24) return `${hours}時間前`
  if (days < 7) return `${days}日前`

  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const errorMessage = computed(() => {
  if (!error.value) return ''
  const e = error.value
  if (e.data?.message) return e.data.message
  return '読み込みに失敗しました'
})

// URLを検出する関数
function extractUrls(text: string): string[] {
  if (!text) return []
  
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const matches = text.match(urlRegex) || []
  
  return matches.map(url => {
    if (url.startsWith('www.')) {
      return 'https://' + url
    }
    try {
      new URL(url)
      return url
    } catch {
      return null
    }
  }).filter((url): url is string => url !== null)
}

// URLをリンクに変換する関数
function linkifyText(text: string): string {
  if (!text) return ''
  
  // URLの正規表現（http://, https://, www.で始まるURLを検出）
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(urlRegex, (url) => {
      let href = url
      // www.で始まる場合はhttps://を追加
      if (url.startsWith('www.')) {
        href = 'https://' + url
      }
      // URLが有効かどうかを簡易チェック
      try {
        new URL(href)
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${url}</a>`
      } catch {
        return url
      }
    })
}
</script>
