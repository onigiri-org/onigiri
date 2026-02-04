<template>
  <a
    :href="ogpData?.url || url"
    target="_blank"
    rel="noopener noreferrer"
    class="block mt-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    @click.stop
  >
    <div v-if="loading" class="p-4 flex items-center gap-3">
      <div class="flex-shrink-0 w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div class="flex-1 space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
      </div>
    </div>
    <div v-else-if="ogpData" class="flex">
      <!-- 画像がある場合 -->
      <div v-if="ogpData.image && !imageError" class="flex-shrink-0 w-32 h-32 bg-gray-100 dark:bg-gray-800">
        <img
          :src="ogpData.image"
          :alt="ogpData.title"
          class="w-full h-full object-cover"
          @error="imageError = true"
        />
      </div>
      <!-- コンテンツ -->
      <div class="flex-1 p-3 min-w-0">
        <div v-if="ogpData.siteName" class="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
          {{ ogpData.siteName }}
        </div>
        <div v-if="ogpData.title" class="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
          {{ ogpData.title }}
        </div>
        <div v-if="ogpData.description" class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          {{ ogpData.description }}
        </div>
      </div>
    </div>
    <!-- エラー時はシンプルなリンク表示 -->
    <div v-else class="p-3">
      <div class="text-sm text-primary hover:underline break-all">
        {{ url }}
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
interface OgpData {
  url: string
  title: string
  description?: string
  image?: string
  siteName?: string
}

const props = defineProps<{
  url: string
}>()

const loading = ref(true)
const ogpData = ref<OgpData | null>(null)
const imageError = ref(false)

// OGP情報を取得
onMounted(async () => {
  if (!props.url) {
    loading.value = false
    return
  }
  
  try {
    const data = await $fetch<OgpData>(`/api/ogp?url=${encodeURIComponent(props.url)}`)
    ogpData.value = data
  } catch (err: any) {
    console.error('OGP取得エラー:', err, 'URL:', props.url)
    // エラー時はURLのみを表示
    ogpData.value = {
      url: props.url,
      title: props.url
    }
  } finally {
    loading.value = false
  }
})
</script>
