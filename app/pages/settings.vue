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
        <UIcon name="i-lucide-settings" class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-bold">設定</h1>
      </div>

      <!-- 設定メニュー -->
      <div class="space-y-4">
        <!-- 通知設定 -->
        <UCard>
          <NuxtLink
            to="/settings/notifications"
            class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-bell" class="w-5 h-5 text-primary" />
              <div>
                <p class="font-medium">通知設定</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  プッシュ通知や通知の種類を設定
                </p>
              </div>
            </div>
            <UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-400" />
          </NuxtLink>
        </UCard>

        <!-- ログアウト -->
        <UCard>
          <UButton
            block
            variant="ghost"
            color="error"
            size="lg"
            icon="i-lucide-log-out"
            class="justify-start"
            @click="handleLogout"
            :loading="loggingOut"
          >
            ログアウト
          </UButton>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: '設定 | ONIGIRI'
})

const { logout } = useAuth()
const router = useRouter()

const loggingOut = ref(false)

const handleLogout = async () => {
  if (confirm('ログアウトしますか？')) {
    loggingOut.value = true
    try {
      await logout()
      await router.push('/login')
    } catch (error) {
      console.error('ログアウトエラー:', error)
    } finally {
      loggingOut.value = false
    }
  }
}
</script>
