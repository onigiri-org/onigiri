<template>
  <UCard 
    class="hover:shadow-lg transition-shadow"
  >
    <div class="flex gap-4">
      <div class="flex-shrink-0" @click.stop>
        <NuxtLink :to="userUrl" class="block">
          <UAvatar
            :src="post.userAvatarUrl?.trim() || undefined"
            :alt="post.userName"
            :text="(post.userName && post.userName.charAt(0)) ? post.userName.charAt(0).toUpperCase() : '?'"
            size="md"
          />
        </NuxtLink>
      </div>

      <div class="flex-1 min-w-0 cursor-pointer" @click="navigateToPost">
        <!-- リポスト時: 「〇〇 がリポスト」＋元投稿 -->
        <div v-if="isRepost" class="mb-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <UIcon name="i-lucide-repeat" class="w-4 h-4" />
          <NuxtLink :to="userUrl" class="hover:underline font-medium" @click.stop>
            {{ post.userName }}
          </NuxtLink>
          <span>がリポスト</span>
          <span class="text-gray-400 dark:text-gray-500">
            {{ formatDate(post.createdAt) }}
          </span>
          <div class="ml-auto flex items-center gap-2" @click.stop>
            <UDropdownMenu v-if="isMyPost" :items="menuItems">
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-more-vertical"
                :aria-label="'投稿メニュー'"
              />
            </UDropdownMenu>
            <div v-if="showFollowOnPost" class="flex items-center">
              <UButton
                v-if="!displayFollowedByMe"
                variant="outline"
                color="primary"
                size="xs"
                :loading="followLoading"
                @click.stop="followUser"
              >
                フォロー
              </UButton>
              <span v-else class="text-primary" title="フォロー中">
                <UIcon name="i-lucide-user-check" class="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
        <template v-else>
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <NuxtLink
              :to="userUrl"
              class="font-semibold hover:underline"
              @click.stop
            >
              {{ post.userName }}
            </NuxtLink>
            <span class="text-gray-500 dark:text-gray-400 text-sm">
              {{ formatDate(post.createdAt) }}
            </span>
            <div class="ml-auto flex items-center gap-2" @click.stop>
              <UDropdownMenu v-if="isMyPost" :items="menuItems">
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-more-vertical"
                  :aria-label="'投稿メニュー'"
                />
              </UDropdownMenu>
              <div v-if="showFollowOnPost" class="flex items-center">
                <UButton
                  v-if="!displayFollowedByMe"
                  variant="outline"
                  color="primary"
                  size="xs"
                  :loading="followLoading"
                  @click.stop="followUser"
                >
                  フォロー
                </UButton>
                <span v-else class="text-primary" title="フォロー中">
                  <UIcon name="i-lucide-user-check" class="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        </template>

        <div v-if="displayPost.tags?.length" class="flex flex-wrap gap-1.5 mb-2" @click.stop>
          <NuxtLink
            v-for="t in displayPost.tags"
            :key="t"
            :to="tagUrl(t)"
            class="inline-flex"
          >
            <UBadge
              color="primary"
              variant="soft"
              size="sm"
              class="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {{ t }}
            </UBadge>
          </NuxtLink>
        </div>
        <!-- リポスト時は元投稿を枠で囲む -->
        <div v-if="isRepost" class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/30" @click.stop>
          <div class="flex items-center gap-2 mb-2">
            <NuxtLink :to="displayPostUserUrl" class="flex-shrink-0" @click.stop>
              <UAvatar
                :src="displayPost.userAvatarUrl?.trim() || undefined"
                :alt="displayPost.userName"
                :text="(displayPost.userName && displayPost.userName.charAt(0)) ? displayPost.userName.charAt(0).toUpperCase() : '?'"
                size="sm"
              />
            </NuxtLink>
            <NuxtLink :to="displayPostUserUrl" class="font-medium text-sm hover:underline" @click.stop>
              {{ displayPost.userName }}
            </NuxtLink>
          </div>
          <p class="text-gray-900 dark:text-gray-100 text-sm whitespace-pre-wrap break-words">{{ displayPost.content }}</p>
          <div
            v-if="displayPostImages.length"
            class="mt-2 rounded-lg overflow-hidden max-w-sm border border-gray-200 dark:border-gray-600"
            :class="displayPostImages.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-0.5'"
            @click.stop
          >
            <button
              v-for="(url, i) in displayPostImages.slice(0, 4)"
              :key="i"
              type="button"
              class="aspect-video bg-gray-100 dark:bg-gray-800 min-h-0"
              @click.stop="openImageModal(url)"
            >
              <img :src="url" :alt="displayPost.content" class="w-full h-full object-cover">
            </button>
          </div>
          <!-- リポスト時は元投稿のアイコンを枠内に表示 -->
          <div class="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" @click.stop>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="flex items-center gap-1 hover:text-primary transition-colors"
                  aria-label="コメントする"
                  @click.stop="openCommentModal"
                >
                  <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
                </button>
                <NuxtLink
                  :to="`/posts/${displayPost.id}`"
                  class="hover:text-primary transition-colors"
                  @click.stop
                >
                  <span>{{ displayCommentCount }}</span>
                </NuxtLink>
              </div>
            <button
              type="button"
              class="flex items-center gap-1 transition-colors"
              :class="repostLoading ? 'opacity-50' : displayRepostedByMe ? 'text-green-600' : 'hover:text-green-600 text-gray-500 dark:text-gray-400'"
              :disabled="repostLoading"
              :aria-label="displayRepostedByMe ? 'リポスト解除' : 'リポスト'"
              @click.stop="toggleRepost"
            >
              <UIcon name="i-lucide-repeat" class="w-4 h-4" :class="displayRepostedByMe ? 'fill-current' : ''" />
              <span>{{ displayRepostCount }}</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 transition-colors"
              :class="displayLikedByMe ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'"
              :disabled="likeLoading"
              @click.stop="toggleLike"
            >
              <!-- いいね時は塗りつぶした星、それ以外はアウトライン星 -->
              <span class="inline-flex w-4 h-4 shrink-0" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  :fill="displayLikedByMe ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-full h-full"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>{{ displayLikeCount }}</span>
            </button>
          </div>
        </div>
        <p v-else class="text-gray-900 dark:text-gray-100 mb-3 whitespace-pre-wrap">{{ displayPost.content }}</p>

        <div
          v-if="!isRepost && displayPostImages.length"
          class="mb-3 rounded-xl overflow-hidden max-w-md border border-gray-200 dark:border-gray-700"
          :class="
            displayPostImages.length === 1
              ? 'grid grid-cols-1'
              : displayPostImages.length === 3
                ? 'grid grid-cols-2 grid-rows-2 gap-0.5'
                : 'grid grid-cols-2 gap-0.5'
          "
          @click.stop
        >
          <template v-if="displayPostImages.length === 1">
            <button type="button" class="block w-full aspect-video bg-gray-100 dark:bg-gray-800" @click.stop="openImageModal(displayPostImages[0])">
              <img :src="displayPostImages[0]" :alt="displayPost.content" class="w-full h-full object-cover">
            </button>
          </template>
          <template v-else-if="displayPostImages.length === 2">
            <button v-for="(url, i) in displayPostImages" :key="i" type="button" class="block w-full aspect-video bg-gray-100 dark:bg-gray-800" @click.stop="openImageModal(url)">
              <img :src="url" :alt="displayPost.content" class="w-full h-full object-cover">
            </button>
          </template>
          <template v-else-if="displayPostImages.length === 3">
            <button type="button" class="row-span-2 w-full min-h-0 bg-gray-100 dark:bg-gray-800 flex" @click.stop="openImageModal(displayPostImages[0])">
              <img :src="displayPostImages[0]" :alt="displayPost.content" class="w-full h-full object-cover min-h-[140px]">
            </button>
            <button v-for="(url, i) in [displayPostImages[1], displayPostImages[2]]" :key="i" type="button" class="aspect-video bg-gray-100 dark:bg-gray-800 min-h-0" @click.stop="openImageModal(url)">
              <img :src="url" :alt="displayPost.content" class="w-full h-full object-cover">
            </button>
          </template>
          <template v-else>
            <button v-for="(url, i) in displayPostImages" :key="i" type="button" class="aspect-video bg-gray-100 dark:bg-gray-800 min-h-0" @click.stop="openImageModal(url)">
              <img :src="url" :alt="displayPost.content" class="w-full h-full object-cover">
            </button>
          </template>
        </div>

        <UModal v-model:open="imageModalOpen" :ui="{ width: 'max-w-4xl' }">
          <template #content>
            <div class="p-2 flex justify-end">
              <UButton variant="ghost" color="neutral" icon="i-lucide-x" size="sm" @click="imageModalOpen = false" />
            </div>
            <img v-if="modalImageUrl" :src="modalImageUrl" :alt="post.content" class="w-full max-h-[85vh] object-contain rounded-lg">
          </template>
        </UModal>

        <!-- コメント投稿モーダル -->
        <UModal v-model:open="commentModalOpen" :ui="{ width: 'sm:max-w-lg' }" @close="resetCommentForm">
          <template #header>
            <h2 class="text-lg font-semibold">コメントする</h2>
          </template>
          <template #body>
            <!-- 元の投稿 -->
            <div class="mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div class="flex gap-3">
                <NuxtLink :to="userUrl" class="flex-shrink-0">
                  <UAvatar
                    :src="post.userAvatarUrl?.trim() || undefined"
                    :alt="post.userName"
                    :text="(post.userName && post.userName.charAt(0)) ? post.userName.charAt(0).toUpperCase() : '?'"
                    size="sm"
                  />
                </NuxtLink>
                <div class="min-w-0 flex-1">
                  <NuxtLink :to="userUrl" class="font-medium text-sm hover:underline">
                    {{ post.userName }}
                  </NuxtLink>
                  <p class="mt-0.5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3 break-words">
                    {{ post.content }}
                  </p>
                  <div v-if="postImages.length" class="mt-2 flex gap-1">
                    <img
                      v-for="(url, i) in postImages.slice(0, 2)"
                      :key="i"
                      :src="url"
                      :alt="`画像${i + 1}`"
                      class="h-12 w-12 object-cover rounded border border-gray-200 dark:border-gray-600"
                    >
                  </div>
                </div>
              </div>
            </div>

            <form id="comment-form" @submit.prevent="submitComment" class="space-y-4">
              <UFormField label="コメント内容" :hint="`${commentContent.length}/500文字`">
                <UTextarea
                  v-model="commentContent"
                  :rows="3"
                  placeholder="コメントを入力..."
                  :maxlength="500"
                  size="md"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="画像（任意・最大4枚）">
                <div class="space-y-2">
                  <input
                    ref="commentImageInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-medium hover:file:opacity-90"
                    @change="onCommentImageSelect"
                  >
                  <p v-if="commentImageUploading" class="text-sm text-gray-500">アップロード中...</p>
                  <div v-if="commentImageUrls.length" class="flex flex-wrap gap-2 mt-2">
                    <div v-for="(url, idx) in commentImageUrls" :key="url" class="relative">
                      <img :src="url" :alt="`プレビュー ${idx + 1}`" class="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700">
                      <button type="button" class="absolute -top-0.5 -right-0.5 rounded-full bg-gray-800 text-white p-0.5 hover:bg-gray-700" aria-label="削除" @click="removeCommentImage(idx)">
                        <UIcon name="i-lucide-x" class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </UFormField>
              <UAlert v-if="commentError" color="error" variant="soft" :title="commentError" />
            </form>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton color="neutral" variant="ghost" size="md" @click="commentModalOpen = false">
                キャンセル
              </UButton>
              <UButton type="submit" form="comment-form" :loading="commentSubmitting" :disabled="!commentContent.trim()" size="md">
                コメントする
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- 削除確認モーダル -->
        <UModal v-model:open="deleteModalOpen" :ui="{ width: 'sm:max-w-md' }">
          <template #header>
            <h2 class="text-lg font-semibold">投稿を削除</h2>
          </template>
          <template #body>
            <p class="text-gray-700 dark:text-gray-300">
              この投稿を削除しますか？この操作は取り消せません。
            </p>
          </template>
          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton
                color="neutral"
                variant="ghost"
                size="md"
                :disabled="deleteLoading"
                @click="deleteModalOpen = false"
              >
                キャンセル
              </UButton>
              <UButton
                color="error"
                size="md"
                :loading="deleteLoading"
                @click="deletePost"
              >
                削除
              </UButton>
            </div>
          </template>
        </UModal>

        <div v-if="post.shopName" class="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg" @click.stop>
          <div class="flex items-center gap-1 text-sm">
            <UIcon name="i-lucide-map-pin" class="w-4 h-4 text-gray-500" />
            <span class="font-medium">{{ post.shopName }}</span>
          </div>
          <p v-if="post.shopAddress" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ post.shopAddress }}
          </p>
        </div>

        <!-- 通常の投稿の場合のみアイコンを表示（リポスト時は元投稿の枠内に表示） -->
        <div v-if="!isRepost" class="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm" @click.stop>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex items-center gap-1 hover:text-primary transition-colors"
              aria-label="コメントする"
              @click.stop="openCommentModal"
            >
              <UIcon name="i-lucide-message-circle" class="w-4 h-4" />
            </button>
            <NuxtLink
              :to="`/posts/${post.id}`"
              class="hover:text-primary transition-colors"
              @click.stop
            >
              <span>{{ displayCommentCount }}</span>
            </NuxtLink>
          </div>
          <button
            type="button"
            class="flex items-center gap-1 transition-colors"
            :class="repostLoading ? 'opacity-50' : displayRepostedByMe ? 'text-green-600' : 'hover:text-green-600 text-gray-500 dark:text-gray-400'"
            :disabled="repostLoading"
            :aria-label="displayRepostedByMe ? 'リポスト解除' : 'リポスト'"
            @click.stop="toggleRepost"
          >
            <UIcon name="i-lucide-repeat" class="w-4 h-4" :class="displayRepostedByMe ? 'fill-current' : ''" />
            <span>{{ displayRepostCount }}</span>
          </button>
            <button
            type="button"
            class="flex items-center gap-1 transition-colors"
            :class="displayLikedByMe ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'"
            :disabled="likeLoading"
            @click.stop="toggleLike"
          >
              <!-- いいね時は塗りつぶした星、それ以外はアウトライン星 -->
              <span class="inline-flex w-4 h-4 shrink-0" aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  :fill="displayLikedByMe ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-full h-full"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <span>{{ displayLikeCount }}</span>
            </button>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
interface Post {
  id: number
  userId: string
  content: string
  imageUrl?: string
  imageUrls?: string[]
  tags?: string[]
  shopId?: string
  commentToId?: number
  repostOfId?: number
  createdAt: number
  userName: string
  userAvatarUrl?: string
  userHandle?: string
  shopName?: string
  shopAddress?: string
  likeCount?: number
  commentCount?: number
  repostCount?: number
  likedByMe?: boolean
  repostedByMe?: boolean
  followedByMe?: boolean
  originalPost?: Post
}

const props = defineProps<{
  post: Post
}>()

const emit = defineEmits<{
  likeToggled: [{ postId: number; liked: boolean; likeCount: number }]
  commented: [postId: number]
  reposted: []
  followed: [userId: string]
  deleted: [postId: number]
}>()

const { user } = useAuth()

const isMyPost = computed(() => !!user.value && props.post.userId === user.value.id)
const showFollowOnPost = computed(() => !!user.value && props.post.userId !== user.value.id)
const localFollowed = ref<boolean | null>(null)
const displayFollowedByMe = computed(() => localFollowed.value !== null ? localFollowed.value : (props.post.followedByMe ?? false))
const followLoading = ref(false)
const postAuthorId = computed(() => props.post.userHandle || props.post.userId)

async function followUser() {
  if (!user.value) return
  if (followLoading.value) return
  followLoading.value = true
  try {
    await $fetch(`/api/users/${encodeURIComponent(postAuthorId.value)}/follow`, { method: 'POST' })
    localFollowed.value = true
    emit('followed', props.post.userId)
  } catch (err) {
    console.error('Follow error:', err)
  } finally {
    followLoading.value = false
  }
}

const isRepost = computed(() => props.post.repostOfId != null && props.post.originalPost != null)
const displayPost = computed(() => props.post.originalPost ?? props.post)
const displayPostImages = computed(() => {
  const p = displayPost.value
  const urls = p.imageUrls?.length ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : [])
  return urls
})
const displayPostUserUrl = computed(() => `/users/${displayPost.value.userHandle || displayPost.value.userId}`)
const userUrl = computed(() => `/users/${props.post.userHandle || props.post.userId}`)

const repostLoading = ref(false)
const localReposted = ref<boolean | null>(null)
const displayRepostedByMe = computed(() => {
  if (localReposted.value !== null) return localReposted.value
  // リポストの場合は元投稿のリポスト状態を表示
  if (isRepost.value && props.post.originalPost?.repostedByMe !== undefined) {
    return props.post.originalPost.repostedByMe
  }
  return props.post.repostedByMe ?? false
})

async function toggleRepost() {
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  if (repostLoading.value) return
  repostLoading.value = true
  try {
    if (displayRepostedByMe.value) {
      // リポスト解除
      await $fetch(`/api/posts/${displayPost.value.id}/repost`, {
        method: 'DELETE'
      })
      localReposted.value = false
      // リポスト件数を更新
      if (localRepostCount.value !== null) {
        localRepostCount.value = Math.max(0, localRepostCount.value - 1)
      } else {
        localRepostCount.value = Math.max(0, displayRepostCount.value - 1)
      }
    } else {
      // リポスト
      await $fetch('/api/posts', {
        method: 'POST',
        body: { repostOfId: displayPost.value.id, content: '' }
      })
      localReposted.value = true
      // リポスト件数を更新
      if (localRepostCount.value !== null) {
        localRepostCount.value += 1
      } else {
        localRepostCount.value = displayRepostCount.value + 1
      }
    }
    emit('reposted')
  } catch (err) {
    console.error('Repost toggle error:', err)
  } finally {
    repostLoading.value = false
  }
}
const commentModalOpen = ref(false)
const localCommentCount = ref<number | null>(null)
const displayCommentCount = computed(() => localCommentCount.value !== null ? localCommentCount.value : (props.post.commentCount ?? 0))

const localRepostCount = ref<number | null>(null)
const displayRepostCount = computed(() => {
  if (localRepostCount.value !== null) return localRepostCount.value
  // リポストの場合は元投稿のリポスト件数を表示
  if (isRepost.value && props.post.originalPost?.repostCount !== undefined) {
    return props.post.originalPost.repostCount
  }
  return props.post.repostCount ?? 0
})

function openCommentModal() {
  if (!user.value) {
    navigateTo('/login')
    return
  }
  commentModalOpen.value = true
}

// コメントフォーム
const MAX_COMMENT_IMAGES = 4
const commentContent = ref('')
const commentImageUrls = ref<string[]>([])
const commentImageInputRef = ref<HTMLInputElement | null>(null)
const commentImageUploading = ref(false)
const commentSubmitting = ref(false)
const commentError = ref('')

const uploadImages = useUpload('/api/upload', { formKey: 'files', multiple: true })

async function onCommentImageSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (!files.length) return
  const remaining = MAX_COMMENT_IMAGES - commentImageUrls.value.length
  if (remaining <= 0) {
    target.value = ''
    return
  }
  commentImageUploading.value = true
  commentError.value = ''
  try {
    const result = await uploadImages(target)
    const list = Array.isArray(result) ? result : result ? [result] : []
    const pathnames = list.slice(0, remaining).map((item: { pathname?: string }) => item?.pathname).filter(Boolean) as string[]
    const newUrls = pathnames.map(p => `/images/${p}`)
    commentImageUrls.value = [...commentImageUrls.value, ...newUrls].slice(0, MAX_COMMENT_IMAGES)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    commentError.value = err?.data?.message ?? err?.message ?? '画像のアップロードに失敗しました'
  } finally {
    commentImageUploading.value = false
    target.value = ''
  }
}

function removeCommentImage(index: number) {
  commentImageUrls.value = commentImageUrls.value.filter((_url: string, i: number) => i !== index)
}

function resetCommentForm() {
  commentContent.value = ''
  commentImageUrls.value = []
  commentError.value = ''
  if (commentImageInputRef.value) commentImageInputRef.value.value = ''
}

async function submitComment() {
  if (!commentContent.value.trim()) {
    commentError.value = 'コメント内容を入力してください'
    return
  }
  if (!user.value) return
  commentSubmitting.value = true
  commentError.value = ''
  try {
    await $fetch('/api/posts', {
      method: 'POST',
      body: {
        content: commentContent.value.trim(),
        imageUrls: commentImageUrls.value.length ? commentImageUrls.value : undefined,
        commentToId: displayPost.value.id
      }
    })
    localCommentCount.value = displayCommentCount.value + 1
    commentModalOpen.value = false
    resetCommentForm()
    emit('commented', displayPost.value.id)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    commentError.value = e?.data?.message ?? e?.message ?? 'コメントに失敗しました'
  } finally {
    commentSubmitting.value = false
  }
}
const likeLoading = ref(false)
const localLiked = ref<boolean | null>(null)
const localCount = ref<number | null>(null)

const displayLikedByMe = computed(() => localLiked.value !== null ? localLiked.value : (props.post.likedByMe ?? false))
const displayLikeCount = computed(() => localCount.value !== null ? localCount.value : (props.post.likeCount ?? 0))

async function toggleLike() {
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  if (likeLoading.value) return
  likeLoading.value = true
  try {
    const res = await $fetch<{ liked: boolean; likeCount: number }>(`/api/posts/${displayPost.value.id}/like`, {
      method: 'POST'
    })
    localLiked.value = res.liked
    localCount.value = res.likeCount
    emit('likeToggled', { postId: displayPost.value.id, liked: res.liked, likeCount: res.likeCount })
  } catch (err) {
    console.error('Like error:', err)
  } finally {
    likeLoading.value = false
  }
}

const postImages = computed(() => {
  const urls = props.post.imageUrls?.length ? props.post.imageUrls : (props.post.imageUrl ? [props.post.imageUrl] : [])
  return urls
})

const imageModalOpen = ref(false)
const modalImageUrl = ref('')
function openImageModal(url: string) {
  modalImageUrl.value = url
  imageModalOpen.value = true
}

const tagUrl = (tag: string) => `/tags/${encodeURIComponent(tag)}`

const navigateToPost = () => {
  navigateTo(`/posts/${displayPost.value.id}`)
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

// 削除機能
const deleteModalOpen = ref(false)
const deleteLoading = ref(false)

const menuItems = [
  [{
    label: '削除',
    icon: 'i-lucide-trash-2',
    onSelect: () => {
      deleteModalOpen.value = true
    }
  }]
]

async function deletePost() {
  if (!user.value) return
  if (deleteLoading.value) return
  
  deleteLoading.value = true
  try {
    await $fetch(`/api/posts/${displayPost.value.id}`, {
      method: 'DELETE'
    })
    emit('deleted', displayPost.value.id)
    deleteModalOpen.value = false
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    console.error('削除エラー:', e)
    alert(e?.data?.message ?? e?.message ?? '投稿の削除に失敗しました')
  } finally {
    deleteLoading.value = false
  }
}
</script>
