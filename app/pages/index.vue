<template>
  <UContainer class="max-w-4xl py-6">
    <div class="space-y-6">
      <!-- ヘッダー（中央寄せ） -->
      <div class="flex justify-center py-4">
        <NuxtLink to="/" class="inline-block">
          <OnigiriIcon :size="40" :white-background="true" class="text-primary" />
        </NuxtLink>
      </div>

      <!-- タイムライン -->
      <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        :title="error"
        class="my-8"
      />

      <div v-else-if="posts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        まだ投稿がありません。最初の投稿をしてみましょう！
      </div>

      <div v-else class="space-y-4">
        <PostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @like-toggled="(payload) => updatePostLike(posts, payload)"
          @commented="(postId) => incrementCommentCount(postId)"
          @reposted="refreshPosts"
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

    <!-- 新規投稿モーダル（SP対応：全画面表示） -->
    <UModal
      v-if="user"
      v-model:open="postModalOpen"
      :ui="{
        width: 'w-full sm:max-w-2xl',
        height: 'h-screen sm:h-auto',
        margin: 'm-0 sm:m-auto',
        rounded: 'rounded-none sm:rounded-lg',
        padding: 'p-0',
        overlay: {
          background: 'bg-black/50 dark:bg-black/75'
        },
        body: {
          padding: 'p-0',
          base: 'overflow-hidden'
        },
        header: {
          padding: 'p-0',
          base: 'border-b border-gray-200 dark:border-gray-700'
        }
      }"
      :close-button="false"
      @close="closePostModal"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <button
            type="button"
            class="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="閉じる"
            @click="closePostModal"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
          <h2 class="text-lg font-semibold flex-1 text-center">新規投稿</h2>
          <UButton
            type="submit"
            form="post-form"
            :loading="postFormLoading"
            :disabled="!postFormContent.trim()"
            size="sm"
            class="sm:px-4 flex-shrink-0"
          >
            <span class="hidden sm:inline">投稿</span>
            <span class="sm:hidden">投稿</span>
          </UButton>
        </div>
      </template>
      <template #body>
        <div class="h-full overflow-hidden">
          <PostForm
            ref="postFormRef"
            @posted="onPostSubmitted"
            @cancelled="closePostModal"
          />
        </div>
      </template>
    </UModal>

    <!-- 右下固定ボタン -->
    <UButton
      v-if="user"
      color="primary"
      size="lg"
      class="fixed bottom-20 md:bottom-6 right-6 rounded-full shadow-lg z-[60] flex flex-col gap-0.5 items-center justify-center min-w-[3.5rem] min-h-[3.5rem]"
      aria-label="新規投稿"
      @click="openPostModal"
    >
      <span class="text-xs font-medium leading-none">投稿</span>
      <OnigiriIcon :size="20" :white-background="false" />
    </UButton>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: 'タイムライン | ONIGIRI'
})

const { user } = useAuth()

const offset = ref(0)
const limit = 20

const { data, pending, error, refresh } = await useFetch('/api/posts', {
  query: computed(() => ({
    limit,
    offset: 0
  }))
})

const posts = ref<any[]>([])
const loadingMore = ref(false)
const postModalOpen = ref(false)
const postFormRef = ref<any>(null)
const sentinelRef = ref<HTMLElement | null>(null)
const hasMore = ref(true)

const postFormLoading = computed(() => postFormRef.value?.loading || false)
const postFormContent = computed(() => postFormRef.value?.content || '')

watch(data, () => {
  if (data.value) {
    posts.value = data.value.posts || []
    offset.value = posts.value.length
    hasMore.value = (data.value.posts || []).length === limit
  }
}, { immediate: true })

const refreshPosts = async () => {
  await refresh()
  if (data.value) {
    posts.value = data.value.posts || []
    offset.value = posts.value.length
    hasMore.value = (data.value.posts || []).length === limit
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  try {
    const response = await $fetch('/api/posts', {
      query: {
        limit,
        offset: offset.value
      }
    })
    if (response.posts && response.posts.length > 0) {
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

function updatePostLike(list: any[], payload: { postId: number; liked: boolean; likeCount: number }) {
  const p = list.find((x: any) => x.id === payload.postId)
  if (p) {
    p.likedByMe = payload.liked
    p.likeCount = payload.likeCount
  }
}

function incrementCommentCount(postId: number) {
  const p = posts.value.find((x: any) => x.id === postId)
  if (p) p.commentCount = (p.commentCount ?? 0) + 1
}

function removePost(postId: number) {
  posts.value = posts.value.filter((p: any) => p.id !== postId)
}

function openPostModal() {
  postModalOpen.value = true
}

function closePostModal() {
  postModalOpen.value = false
}

function onPostSubmitted() {
  refreshPosts()
  closePostModal()
  if (postFormRef.value) {
    postFormRef.value.reset()
  }
}

</script>
