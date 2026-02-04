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

      <!-- タグ検索UI -->
      <div class="space-y-4">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-search" class="w-6 h-6 text-primary" />
          タグ検索
        </h1>

        <!-- 検索フィールド -->
        <div class="flex gap-2">
          <UInput
            v-model="tagSearchInput"
            placeholder="タグを入力して検索..."
            class="flex-1"
            @input="onTagSearchInput"
          />
          <UButton
            color="primary"
            @click="searchTag"
            :disabled="!tagSearchInput.trim()"
          >
            検索
          </UButton>
        </div>

        <!-- 人気タグ（検索フィールドが空の時） -->
        <div v-if="tagSearchInput.trim().length === 0 && popularTags.length > 0" class="space-y-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">人気のタグ:</p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in popularTags"
              :key="tag"
              color="neutral"
              variant="outline"
              class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="navigateToTag(tag)"
            >
              {{ tag }}
            </UBadge>
          </div>
        </div>

        <!-- サジェスト（検索フィールドに入力がある時） -->
        <div v-else-if="tagSuggestions.length > 0" class="space-y-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">サジェスト（クリックで検索）:</p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="suggestion in tagSuggestions"
              :key="suggestion"
              color="neutral"
              variant="outline"
              class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="navigateToTag(suggestion)"
            >
              {{ suggestion }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: 'タグ検索 | ONIGIRI'
})

const router = useRouter()

// タグ検索関連
const tagSearchInput = ref('')
const tagSuggestions = ref<string[]>([])
const popularTags = ref<string[]>([])
let tagSearchTimeout: NodeJS.Timeout | null = null

// 人気タグを取得（検索フィールドが空の時）
const loadPopularTags = async () => {
  try {
    const response = await $fetch<{ tags: string[] }>('/api/tags/suggest?limit=20')
    popularTags.value = response.tags || []
  } catch (error: any) {
    console.error('人気タグ取得エラー:', error)
    popularTags.value = []
  }
}

// 初期化時に人気タグを読み込む
onMounted(() => {
  loadPopularTags()
})

const onTagSearchInput = async () => {
  // デバウンス処理
  if (tagSearchTimeout) {
    clearTimeout(tagSearchTimeout)
  }
  tagSearchTimeout = setTimeout(async () => {
    const search = tagSearchInput.value.trim()
    if (search.length === 0) {
      tagSuggestions.value = []
      // 検索フィールドが空の時は人気タグを再読み込み
      await loadPopularTags()
      return
    }
    try {
      // URLパラメータを直接構築
      const searchParam = encodeURIComponent(search)
      const url = `/api/tags/suggest?search=${searchParam}&limit=10`
      const response = await $fetch<{ tags: string[] }>(url)
      tagSuggestions.value = response.tags || []
    } catch (error: any) {
      console.error('タグサジェスト取得エラー:', error)
      tagSuggestions.value = []
    }
  }, 300)
}

// タグページに遷移
const navigateToTag = (tag: string) => {
  const encodedTag = encodeURIComponent(tag)
  router.push(`/tags/${encodedTag}`)
}

// タグを検索（単一タグのみ）
const searchTag = () => {
  const trimmedTag = tagSearchInput.value.trim()
  if (trimmedTag) {
    navigateToTag(trimmedTag)
  }
}

onUnmounted(() => {
  if (tagSearchTimeout) {
    clearTimeout(tagSearchTimeout)
  }
})
</script>
