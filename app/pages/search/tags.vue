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
          to="/search"
        >
          検索に戻る
        </UButton>
      </div>

      <!-- タグ見出し -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-search" class="w-6 h-6 text-primary" />
          <h1 class="text-2xl font-bold">
            タグ検索結果
          </h1>
        </div>
        <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-2">
          <UBadge
            v-for="tag in selectedTags"
            :key="tag"
            color="primary"
            variant="soft"
            class="text-sm"
          >
            {{ tag }}
          </UBadge>
        </div>
      </div>

      <!-- 読み込み中 -->
      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        :title="errorMessage"
        class="my-8"
      >
        <template #description>
          <div class="text-sm mt-2">
            <p>検索タグ: {{ selectedTags.join(', ') || '(なし)' }}</p>
            <p v-if="error?.data">詳細: {{ JSON.stringify(error.data) }}</p>
            <p v-if="error?.statusCode">ステータス: {{ error.statusCode }}</p>
          </div>
        </template>
      </UAlert>

      <div v-else-if="posts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <p class="mb-2">該当する投稿は見つかりませんでした。</p>
        <UButton
          variant="ghost"
          color="primary"
          size="sm"
          to="/search"
        >
          別のタグで検索する
        </UButton>
      </div>

      <div v-else class="space-y-4">
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @like-toggled="(payload) => updatePostLike(posts, payload)"
          @commented="(postId) => incrementCommentCount(postId)"
          @reposted="refresh"
          @deleted="(postId) => removePost(postId)"
        />
      </div>

      <!-- 無限スクロール用のセンチネル -->
      <div
        v-if="posts.length > 0 && !loadingMore"
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
const route = useRoute()

useHead({
  title: computed(() => {
    const tags = tagsParam.value
    if (tags && tags.length > 0) {
      return `${tags.join(', ')} の検索結果 | ONIGIRI`
    }
    return 'タグ検索 | ONIGIRI'
  })
})

// URLクエリパラメータからタグを取得
const tagsParam = computed(() => {
  const tags = route.query.tags
  console.log('[search/tags] route.query.tags:', tags, typeof tags)
  if (!tags) {
    console.log('[search/tags] No tags in query')
    return []
  }
  if (typeof tags === 'string') {
    // Nuxtのroute.queryは既にデコードされている
    const result = tags.split(',').map(t => t.trim()).filter(Boolean)
    console.log('[search/tags] Parsed tags:', result)
    return result
  }
  if (Array.isArray(tags)) {
    const result = tags.map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean)
    console.log('[search/tags] Parsed tags (array):', result)
    return result
  }
  return []
})

const selectedTags = computed(() => {
  const result = tagsParam.value
  console.log('[search/tags] selectedTags computed:', result)
  return result
})

const offset = ref(0)
const limit = 20

console.log('[search/tags] About to call useFetch, selectedTags:', selectedTags.value)

const { data, pending, error, refresh } = await useFetch('/api/posts', {
  query: computed(() => {
    console.log('[search/tags] useFetch query computed - selectedTags:', selectedTags.value)
    if (selectedTags.value.length === 0) {
      console.log('[search/tags] No tags selected, returning empty query')
      return { limit, offset: 0 }
    }
    const query = {
      tags: selectedTags.value.join(','),
      limit,
      offset: 0
    }
    console.log('[search/tags] API query:', query, 'selectedTags:', selectedTags.value)
    return query
  })
})

console.log('[search/tags] useFetch initialized, pending:', pending.value, 'error:', error.value, 'data:', data.value)

const posts = ref<any[]>([])
const loadingMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const hasMore = ref(true)

watch(data, () => {
  console.log('[search/tags] Data changed:', data.value)
  if (data.value) {
    posts.value = data.value.posts || []
    offset.value = posts.value.length
    hasMore.value = (data.value.posts || []).length === limit
    console.log('[search/tags] Posts updated:', posts.value.length, 'posts')
  }
}, { immediate: true })

watch(pending, (newPending) => {
  console.log('[search/tags] Pending changed:', newPending)
})

watch(error, (newError) => {
  if (newError) {
    console.error('[search/tags] Error occurred:', newError)
  }
}, { immediate: true })

watch(selectedTags, () => {
  refresh()
  posts.value = []
  offset.value = 0
  hasMore.value = true
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  const e = error.value
  console.error('Error details:', e)
  if (e.data?.message) return e.data.message
  if (e.message) return e.message
  return '読み込みに失敗しました'
})

function updatePostLike(list: any[], payload: { postId: number; liked: boolean; likeCount: number }) {
  const p = list.find((x: any) => x.id === payload.postId)
  if (p) {
    p.likedByMe = payload.liked
    p.likeCount = payload.likeCount
  }
}

function removePost(postId: number) {
  const index = posts.value.findIndex((p: any) => p.id === postId)
  if (index !== -1) {
    posts.value.splice(index, 1)
  }
}

function incrementCommentCount(postId: number) {
  const p = posts.value.find((x: any) => x.id === postId)
  if (p) p.commentCount = (p.commentCount ?? 0) + 1
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  try {
    const response = await $fetch<{ posts: any[] }>('/api/posts', {
      query: {
        tags: selectedTags.value.join(','),
        limit,
        offset: offset.value
      }
    })
    if (response.posts?.length > 0) {
      posts.value.push(...response.posts)
      offset.value += response.posts.length
      hasMore.value = response.posts.length === limit
    } else {
      hasMore.value = false
    }
  } catch (err) {
    console.error('投稿の読み込みエラー:', err)
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

onMounted(() => {
  console.log('[search/tags] onMounted called')
  console.log('[search/tags] onMounted - selectedTags:', selectedTags.value)
  console.log('[search/tags] onMounted - pending:', pending.value)
  console.log('[search/tags] onMounted - error:', error.value)
  console.log('[search/tags] onMounted - data:', data.value)
  console.log('[search/tags] onMounted - posts:', posts.value)
  console.log('[search/tags] onMounted - route.query:', route.query)
})

</script>
