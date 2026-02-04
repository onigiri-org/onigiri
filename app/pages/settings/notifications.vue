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
          to="/settings"
        >
          設定に戻る
        </UButton>
      </div>

      <!-- ヘッダー -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-bell" class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-bold">通知設定</h1>
      </div>

      <!-- 通知設定 -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">プッシュ通知</h2>
        </template>
        <template #body>
          <div class="space-y-4">
            <div v-if="!isSupported" class="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                このブラウザはプッシュ通知をサポートしていません。
              </p>
            </div>

            <div v-else class="space-y-4">
              <!-- 通知許可状態 -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">通知の許可</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    現在の状態: {{ notificationPermissionText }}
                  </p>
                </div>
                <UButton
                  v-if="notificationPermission === 'default'"
                  color="primary"
                  @click="requestNotificationPermission"
                  :loading="requestingPermission"
                >
                  通知を許可
                </UButton>
                <UButton
                  v-else-if="notificationPermission === 'denied'"
                  variant="outline"
                  disabled
                >
                  通知が拒否されています
                </UButton>
                <UBadge v-else color="success" variant="soft">
                  許可済み
                </UBadge>
              </div>

              <!-- プッシュ通知の購読 -->
              <div v-if="notificationPermission === 'granted'" class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p class="font-medium">プッシュ通知の購読</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ isSubscribed ? 'プッシュ通知が有効です' : 'プッシュ通知を有効にすると、新しい通知を受け取れます' }}
                  </p>
                </div>
                <UButton
                  v-if="!isSubscribed"
                  color="primary"
                  @click="subscribeToPushNotifications"
                  :loading="subscribing"
                >
                  有効にする
                </UButton>
                <UButton
                  v-else
                  variant="outline"
                  color="error"
                  @click="unsubscribeFromPushNotifications"
                  :loading="unsubscribing"
                >
                  無効にする
                </UButton>
              </div>
            </div>
          </div>
        </template>
      </UCard>

      <!-- 通知の種類 -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">通知の種類</h2>
        </template>
        <template #body>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium">いいね通知</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  あなたの投稿にいいねがあったときに通知を受け取ります
                </p>
              </div>
              <UCheckbox v-model="notificationSettings.likes" />
            </div>
            <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p class="font-medium">コメント通知</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  あなたの投稿にコメントがあったときに通知を受け取ります
                </p>
              </div>
              <UCheckbox v-model="notificationSettings.comments" />
            </div>
            <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p class="font-medium">リポスト通知</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  あなたの投稿がリポストされたときに通知を受け取ります
                </p>
              </div>
              <UCheckbox v-model="notificationSettings.reposts" />
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { requestPermission, subscribeToPush, unsubscribeFromPush } = usePushNotification()

const isSupported = ref(false)
const notificationPermission = ref<NotificationPermission>('default')
const notificationPermissionText = computed(() => {
  switch (notificationPermission.value) {
    case 'granted':
      return '許可済み'
    case 'denied':
      return '拒否済み'
    default:
      return '未設定'
  }
})

const requestingPermission = ref(false)
const subscribing = ref(false)
const unsubscribing = ref(false)
const isSubscribed = ref(false)

const notificationSettings = ref({
  likes: true,
  comments: true,
  reposts: true
})

// ブラウザのサポート確認
onMounted(() => {
  if (process.client) {
    isSupported.value = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    
    if ('Notification' in window) {
      notificationPermission.value = Notification.permission
    }

    // 購読状態を確認
    checkSubscriptionStatus()
  }
})

const checkSubscriptionStatus = async () => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
    } catch (err) {
      console.error('購読状態の確認エラー:', err)
    }
  }
}

const requestNotificationPermission = async () => {
  requestingPermission.value = true
  try {
    const permission = await requestPermission()
    notificationPermission.value = permission
    if (permission === 'granted') {
      // 通知許可後、自動的に購読を開始するかどうかは任意
    }
  } catch (err: any) {
    console.error('通知許可のリクエストエラー:', err)
    alert(err.message || '通知許可のリクエストに失敗しました')
  } finally {
    requestingPermission.value = false
  }
}

const subscribeToPushNotifications = async () => {
  subscribing.value = true
  try {
    await subscribeToPush()
    isSubscribed.value = true
    alert('プッシュ通知が有効になりました')
  } catch (err: any) {
    console.error('プッシュ通知の購読エラー:', err)
    alert(err.message || 'プッシュ通知の有効化に失敗しました')
  } finally {
    subscribing.value = false
  }
}

const unsubscribeFromPushNotifications = async () => {
  unsubscribing.value = true
  try {
    await unsubscribeFromPush()
    isSubscribed.value = false
    alert('プッシュ通知が無効になりました')
  } catch (err: any) {
    console.error('プッシュ通知の購読解除エラー:', err)
    alert(err.message || 'プッシュ通知の無効化に失敗しました')
  } finally {
    unsubscribing.value = false
  }
}
</script>
