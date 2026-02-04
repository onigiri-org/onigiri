<template>
  <!-- ログインページの場合はレイアウトを適用しない -->
  <div v-if="isLoginPage" class="min-h-screen">
    <slot />
  </div>
  <!-- その他のページはサイドバー付きレイアウト -->
  <div v-else class="flex min-h-screen">
    <!-- サイドバー（常に表示、ログイン時のみユーザー情報を表示） -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
      <div class="sticky top-0 p-4 space-y-4">
        <!-- ユーザー情報（ログイン時のみ表示） -->
        <ClientOnly>
          <NuxtLink
            v-if="user"
            :to="`/users/${user.handle || user.id}`"
            class="block mb-6 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div class="flex items-center gap-3">
              <UAvatar
                :src="userProfile?.avatarUrl?.trim() || undefined"
                :alt="userProfile?.name || user.name"
                :text="((userProfile?.name || user.name) && (userProfile?.name || user.name).charAt(0)) ? (userProfile?.name || user.name).charAt(0).toUpperCase() : '?'"
                size="md"
                class="flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {{ userProfile?.name || user.name }}
                </p>
                <p v-if="userProfile?.handle || user.handle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{{ userProfile?.handle || user.handle }}
                </p>
                <div v-if="userProfile" class="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>フォロー <strong class="text-gray-700 dark:text-gray-300">{{ userProfile.followCount ?? 0 }}</strong></span>
                  <span>フォロワー <strong class="text-gray-700 dark:text-gray-300">{{ userProfile.followerCount ?? 0 }}</strong></span>
                </div>
              </div>
            </div>
          </NuxtLink>
          
          <!-- 未ログイン時のアイコン表示 -->
          <div v-else class="flex justify-center mb-6 py-4">
            <OnigiriIcon :size="48" :white-background="true" class="text-primary" />
          </div>
        </ClientOnly>
        
        <nav class="space-y-2">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            active-class="bg-primary/10 text-primary font-medium"
          >
            <UIcon name="i-lucide-home" class="w-5 h-5" />
            <span>タイムライン</span>
          </NuxtLink>
          
          <ClientOnly>
            <NuxtLink
              v-if="user"
              to="/notifications"
              class="relative flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              active-class="bg-primary/10 text-primary font-medium"
            >
              <UIcon name="i-lucide-bell" class="w-5 h-5" />
              <span>通知</span>
              <span
                v-if="unreadNotificationCount > 0"
                class="absolute top-1/2 right-1 -translate-y-1/2 flex items-center justify-center h-4 bg-error text-white text-[10px] font-medium rounded-full px-1"
                :class="unreadNotificationCount > 9 ? 'min-w-[1.5rem]' : 'w-4'"
              >
                {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
              </span>
            </NuxtLink>
            
            <NuxtLink
              v-if="user"
              :to="`/users/${user.handle || user.id}`"
              class="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              active-class="bg-primary/10 text-primary font-medium"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5" />
              <span>プロフィール</span>
            </NuxtLink>
          </ClientOnly>
          
          <!-- タグ検索 -->
          <NuxtLink
            to="/search"
            class="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            active-class="bg-primary/10 text-primary font-medium"
          >
            <UIcon name="i-lucide-search" class="w-5 h-5" />
            <span>タグ検索</span>
          </NuxtLink>
        </nav>

        <ClientOnly>
          <div v-if="user" class="pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton
              color="neutral"
              variant="ghost"
              size="md"
              class="w-full justify-start"
              @click="handleLogout"
            >
              <UIcon name="i-lucide-log-out" class="w-5 h-5 mr-2" />
              ログアウト
            </UButton>
          </div>
        </ClientOnly>
      </div>
    </aside>

    <!-- メインコンテンツ -->
    <main class="flex-1 min-w-0">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { user, logout, fetchUser } = useAuth()
const { getUnreadCount } = useNotifications()

// 未読通知数を取得
const unreadNotificationCount = ref(0)

// 通知データを取得して未読数を計算
const updateUnreadCount = async () => {
  if (!user.value) {
    unreadNotificationCount.value = 0
    return
  }
  
  try {
    const response = await $fetch<{ notifications: any[] }>('/api/notifications', {
      query: { limit: 100, offset: 0 }
    })
    if (response.notifications) {
      unreadNotificationCount.value = getUnreadCount(response.notifications)
    }
  } catch (err) {
    console.error('未読通知数の取得エラー:', err)
  }
}

// ユーザーが変更されたら未読数を更新
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await updateUnreadCount()
  } else {
    unreadNotificationCount.value = 0
  }
}, { immediate: true })

// 通知ページに遷移したら未読数を更新
watch(() => route.path, (newPath) => {
  if (newPath === '/notifications' && user.value) {
    updateUnreadCount()
  }
})

// ログインページの場合はレイアウトを適用しない
const isLoginPage = computed(() => {
  if (process.server) {
    // サーバーサイドではroute.pathを使用
    return route?.path === '/login'
  }
  // クライアントサイドではrouter.currentRouteを使用
  const currentPath = router?.currentRoute?.value?.path || route?.path || ''
  return currentPath === '/login' || currentPath.startsWith('/login')
})

// 現在のユーザーのプロフィール情報を取得（フォロー数・フォロワー数含む）
const userProfile = ref<any>(null)
const isLoadingProfile = ref(false)

// ユーザー情報を取得する関数
const loadUserProfile = async () => {
  if (!user.value) {
    userProfile.value = null
    return
  }
  if (isLoadingProfile.value) return
  
  isLoadingProfile.value = true
  try {
    const userId = user.value.handle || user.value.id
    const response = await $fetch(`/api/users/${userId}`, {
      query: { limit: 1, offset: 0 }
    })
    userProfile.value = response.user ?? null
  } catch (error) {
    console.error('プロフィール取得エラー:', error)
    userProfile.value = null
  } finally {
    isLoadingProfile.value = false
  }
}

// ユーザーが変更されたらプロフィールを再取得
watch(() => user.value, async (newUser) => {
  if (newUser) {
    await loadUserProfile()
  } else {
    userProfile.value = null
  }
}, { immediate: false })

const handleLogout = async () => {
  await logout()
  await router.push('/login')
}

// 通知が既読になったら未読数を更新
if (process.client) {
  window.addEventListener('notification-read', updateUnreadCount)
}

// クライアントサイドで初期化時にユーザー情報を取得
onMounted(async () => {
  // ユーザー情報を取得
  await fetchUser()
  // ユーザーが存在する場合はプロフィールも取得
  if (user.value) {
    await loadUserProfile()
    await updateUnreadCount()
  }
})

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('notification-read', updateUnreadCount)
  }
})
</script>
