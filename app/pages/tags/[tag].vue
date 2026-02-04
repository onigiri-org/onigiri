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

      <!-- タグ見出し -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-tag" class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-bold">
          「{{ decodedTag }}」の投稿
        </h1>
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
      />

      <div v-else-if="posts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        「{{ decodedTag }}」の投稿はまだありません。
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
const tagParam = computed(() => route.params.tag as string)
const decodedTag = computed(() => {
  try {
    return decodeURIComponent(tagParam.value || '')
  } catch {
    return tagParam.value || ''
  }
})

const offset = ref(0)
const limit = 20

const { data, pending, error, refresh } = await useFetch('/api/posts', {
  query: computed(() => {
    const query = {
      tag: decodedTag.value,
      limit,
      offset: 0
    }
    console.log('[tags/[tag]] API query:', query, 'decodedTag:', decodedTag.value)
    return query
  })
})

console.log('[tags/[tag]] useFetch initialized, pending:', pending.value, 'error:', error.value, 'data:', data.value)

const posts = ref<any[]>([])
const loadingMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const hasMore = ref(true)

watch(data, () => {
  console.log('[tags/[tag]] Data changed:', data.value)
  if (data.value) {
    posts.value = data.value.posts || []
    offset.value = posts.value.length
    hasMore.value = (data.value.posts || []).length === limit
    console.log('[tags/[tag]] Posts updated:', posts.value.length, 'posts')
  }
}, { immediate: true })

watch(pending, (newPending) => {
  console.log('[tags/[tag]] Pending changed:', newPending)
})

watch(error, (newError) => {
  if (newError) {
    console.error('[tags/[tag]] Error occurred:', newError)
  }
}, { immediate: true })

watch(decodedTag, () => {
  refresh()
  posts.value = []
  offset.value = 0
  hasMore.value = true
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  const e = error.value
  if (e.data?.message) return e.data.message
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
        tag: decodedTag.value,
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
</script>
