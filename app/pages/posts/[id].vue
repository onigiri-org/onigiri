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
      />

      <!-- 投稿詳細 -->
      <template v-else-if="post">
        <PostCard :post="post" @commented="onCommented" @deleted="onPostDeleted" />

        <!-- コメント見出し・一覧 -->
        <template v-if="comments.length > 0">
          <div class="px-2">
            <h2 class="text-lg font-semibold mb-4">
              コメント ({{ comments.length }})
            </h2>
          </div>
          <div class="space-y-2">
            <PostCard
              v-for="comment in comments"
              :key="comment.id"
              :post="comment"
            />
          </div>
        </template>
        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          まだコメントはありません
        </div>
      </template>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute()
const postId = computed(() => route.params.id as string)

const { data, pending, error, refresh } = await useFetch(() => `/api/posts/${postId.value}`, {
  key: `post-${postId.value}`
})

const post = computed(() => data.value?.post ?? null)
const comments = computed(() => data.value?.comments ?? [])

useHead({
  title: computed(() => {
    if (post.value) {
      const content = post.value.content || ''
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content
      return `${preview} | ONIGIRI`
    }
    return '投稿詳細 | ONIGIRI'
  })
})

function onCommented() {
  refresh()
}

function onPostDeleted() {
  // 投稿が削除された場合はタイムラインに戻る
  navigateTo('/')
}

const errorMessage = computed(() => {
  if (!error.value) return ''
  const e = error.value
  if (e.data?.message) return e.data.message
  if (e.statusCode === 404) return '投稿が見つかりません'
  return '読み込みに失敗しました'
})
</script>
