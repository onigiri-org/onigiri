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

      <!-- ユーザー詳細 -->
      <template v-else-if="profile">
        <!-- プロフィールカード -->
        <UCard class="relative">
          <!-- 自分の場合: 右上に編集ボタン / 他人の場合: フォローボタン -->
          <UButton
            v-if="isOwnProfile"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-pencil"
            class="absolute top-4 right-4"
            aria-label="プロフィールを編集"
            @click="openEditModal"
          >
            編集
          </UButton>
          <template v-else-if="user">
            <UButton
              v-if="!profileFollowedByMe"
              variant="outline"
              color="primary"
              size="sm"
              class="absolute top-4 right-4"
              :loading="profileFollowLoading"
              @click="toggleProfileFollow"
            >
              フォロー
            </UButton>
            <UButton
              v-else
              variant="outline"
              color="primary"
              size="sm"
              class="absolute top-4 right-4"
              :loading="profileFollowLoading"
              @click="toggleProfileUnfollow"
            >
              <UIcon name="i-lucide-user-check" class="w-4 h-4" />
              フォロー済
            </UButton>
          </template>

          <div class="flex flex-col sm:flex-row gap-6 items-start">
            <UAvatar
              :src="profile.avatarUrl?.trim() || undefined"
              :alt="profile.name"
              :text="(profile.name && profile.name.charAt(0)) ? profile.name.charAt(0).toUpperCase() : '?'"
              size="2xl"
              class="flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <h1 class="text-xl font-bold">{{ profile.name }}</h1>
              <p v-if="profile.handle" class="text-gray-500 dark:text-gray-400 text-sm mt-1">
                @{{ profile.handle }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <button
                  type="button"
                  class="hover:underline"
                  @click="openFollowingModal"
                >
                  フォロー <strong class="text-gray-900 dark:text-gray-100">{{ localFollowCount ?? profile.followCount ?? 0 }}</strong>
                </button>
                <button
                  type="button"
                  class="hover:underline"
                  @click="openFollowersModal"
                >
                  フォロワー <strong class="text-gray-900 dark:text-gray-100">{{ localFollowerCount ?? profile.followerCount ?? 0 }}</strong>
                </button>
              </div>
              <p v-if="profile.bio" class="text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                {{ profile.bio }}
              </p>
              <p v-else-if="!isOwnProfile" class="text-gray-500 dark:text-gray-500 text-sm mt-2">
                自己紹介はまだありません
              </p>
            </div>
          </div>
        </UCard>

        <!-- プロフィール編集モーダル（自分の場合のみ） -->
        <UModal
          v-if="isOwnProfile"
          v-model:open="editModalOpen"
          :ui="{ width: 'sm:max-w-lg' }"
          @close="resetEditForm"
        >
          <template #header>
            <h2 class="text-lg font-semibold">プロフィールを編集</h2>
          </template>

          <template #body>
            <form id="profile-edit-form" @submit.prevent="saveProfile" class="space-y-4">
              <UFormField
                label="ユニークID（URL用）"
                hint="3〜30文字の半角英数字・アンダースコア。未設定の場合は内部IDで表示されます。"
              >
                <UInput
                  v-model="editForm.handle"
                  placeholder="例: gourmet_taro"
                  size="md"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="表示名">
                <UInput
                  v-model="editForm.name"
                  placeholder="山田太郎"
                  size="md"
                  class="w-full"
                  required
                />
              </UFormField>

              <UFormField label="自己紹介">
                <UTextarea
                  v-model="editForm.bio"
                  :rows="3"
                  placeholder="好きなジャンルやこだわりを書いてみましょう"
                  size="md"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="アバター画像">
                <div class="space-y-2">
                  <div v-if="editForm.avatarUrl?.trim()" class="flex items-center gap-3 mb-2">
                    <img
                      :src="editForm.avatarUrl.trim()"
                      alt="アバター"
                      class="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    >
                    <UButton
                      type="button"
                      variant="ghost"
                      color="neutral"
                      size="sm"
                      @click="clearAvatar"
                    >
                      削除
                    </UButton>
                  </div>
                  <input
                    ref="avatarInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-medium hover:file:opacity-90"
                    @change="onAvatarSelect"
                  >
                  <p v-if="avatarUploading" class="text-sm text-gray-500">
                    アップロード中...
                  </p>
                </div>
              </UFormField>

              <UAlert
                v-if="profileError"
                color="error"
                variant="soft"
                :title="profileError"
              />
            </form>
          </template>

          <template #footer>
            <div class="flex justify-end gap-2 w-full">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="md"
                @click="editModalOpen = false"
              >
                キャンセル
              </UButton>
              <UButton
                type="button"
                :loading="saving"
                size="md"
                @click="saveProfile"
              >
                保存する
              </UButton>
            </div>
          </template>
        </UModal>

        <!-- タブ（自分の場合のみいいねタブを表示） -->
        <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="tab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="tab = 'posts'"
          >
            投稿
          </button>
          <button
            v-if="isOwnProfile"
            type="button"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="tab === 'likes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="tab = 'likes'"
          >
            いいね
          </button>
        </div>

        <!-- 投稿一覧 -->
        <template v-if="tab === 'posts'">
          <div v-if="posts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
            まだ投稿がありません
          </div>
          <div v-else class="space-y-4">
            <PostCard
              v-for="p in posts"
              :key="p.id"
              :post="p"
              @like-toggled="onLikeToggled($event, 'posts')"
              @commented="(postId) => incrementCommentCount(postId, posts.value)"
              @reposted="refresh"
              @followed="onProfileFollowed"
              @deleted="(postId) => removePost(postId, posts.value)"
            />
          </div>
          
          <!-- 無限スクロール用のセンチネル（投稿一覧） -->
          <div
            v-if="posts.length > 0 && !loadingMore && tab === 'posts'"
            ref="sentinelRef"
            class="h-1"
          />
          
          <!-- 読み込み中表示（投稿一覧） -->
          <div v-if="loadingMore && tab === 'posts'" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
          </div>
        </template>

        <!-- いいね一覧（自分の場合のみ） -->
        <template v-else-if="tab === 'likes' && isOwnProfile">
          <div v-if="likesPending" class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary" />
          </div>
          <div v-else-if="likedPosts.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
            いいねした投稿はまだありません
          </div>
          <div v-else class="space-y-4">
            <PostCard
              v-for="p in likedPosts"
              :key="p.id"
              :post="p"
              @like-toggled="onLikeToggled($event, 'likes')"
              @commented="(postId) => incrementCommentCount(postId, likedPosts.value)"
              @reposted="refresh"
              @followed="onProfileFollowed"
            />
          </div>
          
          <!-- 無限スクロール用のセンチネル（いいね一覧） -->
          <div
            v-if="likedPosts.length > 0 && !likesLoadingMore && tab === 'likes'"
            ref="likesSentinelRef"
            class="h-1"
          />
          
          <!-- 読み込み中表示（いいね一覧） -->
          <div v-if="likesLoadingMore && tab === 'likes'" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
          </div>
        </template>
      </template>

      <!-- フォロー中一覧モーダル -->
      <UModal
        v-model:open="followingModalOpen"
        :ui="{ width: 'sm:max-w-md' }"
      >
        <template #header>
          <h2 class="text-lg font-semibold">フォロー中</h2>
        </template>
        <template #body>
          <div v-if="followingPending" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
          </div>
          <div v-else-if="followingUsers.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            フォロー中のユーザーはいません
          </div>
          <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
            <div
              v-for="u in followingUsers"
              :key="u.id"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <NuxtLink :to="`/users/${u.handle || u.id}`" class="flex-shrink-0">
                <UAvatar
                  :src="u.avatarUrl?.trim() || undefined"
                  :alt="u.name"
                  :text="(u.name && u.name.charAt(0)) ? u.name.charAt(0).toUpperCase() : '?'"
                  size="md"
                />
              </NuxtLink>
              <div class="flex-1 min-w-0">
                <NuxtLink :to="`/users/${u.handle || u.id}`" class="block">
                  <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {{ u.name }}
                  </p>
                  <p v-if="u.handle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{{ u.handle }}
                  </p>
                </NuxtLink>
              </div>
              <UButton
                v-if="user && u.id !== user.id"
                :variant="u.followedByMe ? 'outline' : 'solid'"
                :color="u.followedByMe ? 'neutral' : 'primary'"
                size="sm"
                :loading="followingLoadingMap[u.id]"
                @click="toggleFollowInList(u.id, 'following')"
              >
                <template v-if="u.followedByMe">
                  <UIcon name="i-lucide-user-check" class="w-4 h-4 mr-1" />
                  フォロー済
                </template>
                <template v-else>
                  フォロー
                </template>
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- フォロワー一覧モーダル -->
      <UModal
        v-model:open="followersModalOpen"
        :ui="{ width: 'sm:max-w-md' }"
      >
        <template #header>
          <h2 class="text-lg font-semibold">フォロワー</h2>
        </template>
        <template #body>
          <div v-if="followersPending" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-primary" />
          </div>
          <div v-else-if="followersUsers.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            フォロワーはいません
          </div>
          <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
            <div
              v-for="u in followersUsers"
              :key="u.id"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <NuxtLink :to="`/users/${u.handle || u.id}`" class="flex-shrink-0">
                <UAvatar
                  :src="u.avatarUrl?.trim() || undefined"
                  :alt="u.name"
                  :text="(u.name && u.name.charAt(0)) ? u.name.charAt(0).toUpperCase() : '?'"
                  size="md"
                />
              </NuxtLink>
              <div class="flex-1 min-w-0">
                <NuxtLink :to="`/users/${u.handle || u.id}`" class="block">
                  <p class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {{ u.name }}
                  </p>
                  <p v-if="u.handle" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{{ u.handle }}
                  </p>
                </NuxtLink>
              </div>
              <UButton
                v-if="user && u.id !== user.id"
                :variant="u.followedByMe ? 'outline' : 'solid'"
                :color="u.followedByMe ? 'neutral' : 'primary'"
                size="sm"
                :loading="followersLoadingMap[u.id]"
                @click="toggleFollowInList(u.id, 'followers')"
              >
                <template v-if="u.followedByMe">
                  <UIcon name="i-lucide-user-check" class="w-4 h-4 mr-1" />
                  フォロー済
                </template>
                <template v-else>
                  フォロー
                </template>
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const identifier = computed(() => route.params.id as string)

const { user, fetchUser } = useAuth()

const { data, pending, error, refresh } = await useFetch(() => `/api/users/${identifier.value}`, {
  key: () => `user-${identifier.value}`,
  query: { limit: 20, offset: 0 }
})

const profile = computed(() => data.value?.user ?? null)
const posts = ref<any[]>([])
const loadingMore = ref(false)
const tab = ref<'posts' | 'likes'>('posts')
const likedPosts = ref<any[]>([])
const likesLoadingMore = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const likesSentinelRef = ref<HTMLElement | null>(null)
const hasMore = ref(true)
const likesHasMore = ref(true)

const isOwnProfile = computed(() => user.value && profile.value && user.value.id === profile.value.id)

const profileFollowedByMe = computed(() => {
  if (localProfileFollowed.value !== null) return localProfileFollowed.value
  return profile.value?.followedByMe ?? false
})
const localProfileFollowed = ref<boolean | null>(null)
const localFollowCount = ref<number | null>(null)
const localFollowerCount = ref<number | null>(null)
const profileFollowLoading = ref(false)

// フォロー中・フォロワー一覧モーダル
const followingModalOpen = ref(false)
const followersModalOpen = ref(false)
const followingUsers = ref<any[]>([])
const followersUsers = ref<any[]>([])
const followingPending = ref(false)
const followersPending = ref(false)
const followingLoadingMap = ref<Record<string, boolean>>({})
const followersLoadingMap = ref<Record<string, boolean>>({})

async function openFollowingModal() {
  followingModalOpen.value = true
  if (followingUsers.value.length === 0 && !followingPending.value) {
    await loadFollowing()
  }
}

async function openFollowersModal() {
  followersModalOpen.value = true
  if (followersUsers.value.length === 0 && !followersPending.value) {
    await loadFollowers()
  }
}

async function loadFollowing() {
  if (!identifier.value) return
  followingPending.value = true
  try {
    const data = await $fetch<{ users: any[] }>(`/api/users/${encodeURIComponent(identifier.value)}/following`)
    followingUsers.value = data.users || []
  } catch (err) {
    console.error('フォロー中一覧の読み込みエラー:', err)
  } finally {
    followingPending.value = false
  }
}

async function loadFollowers() {
  if (!identifier.value) return
  followersPending.value = true
  try {
    const data = await $fetch<{ users: any[] }>(`/api/users/${encodeURIComponent(identifier.value)}/followers`)
    followersUsers.value = data.users || []
  } catch (err) {
    console.error('フォロワー一覧の読み込みエラー:', err)
  } finally {
    followersPending.value = false
  }
}

async function toggleFollowInList(targetUserId: string, listType: 'following' | 'followers') {
  if (!user.value) return
  const loadingMap = listType === 'following' ? followingLoadingMap : followersLoadingMap
  const userList = listType === 'following' ? followingUsers : followersUsers
  
  if (loadingMap.value[targetUserId]) return
  loadingMap.value[targetUserId] = true
  
  try {
    const targetUser = userList.value.find((u: any) => u.id === targetUserId)
    if (!targetUser) return
    
    if (targetUser.followedByMe) {
      // フォロー解除
      await $fetch(`/api/users/${encodeURIComponent(targetUser.handle || targetUser.id)}/follow`, { method: 'DELETE' })
      targetUser.followedByMe = false
    } else {
      // フォロー
      await $fetch(`/api/users/${encodeURIComponent(targetUser.handle || targetUser.id)}/follow`, { method: 'POST' })
      targetUser.followedByMe = true
    }
  } catch (err) {
    console.error('Follow toggle error:', err)
  } finally {
    loadingMap.value[targetUserId] = false
  }
}

async function toggleProfileFollow() {
  if (!identifier.value || !user.value) return
  if (profileFollowLoading.value) return
  profileFollowLoading.value = true
  try {
    await $fetch(`/api/users/${encodeURIComponent(identifier.value)}/follow`, { method: 'POST' })
    localProfileFollowed.value = true
    if (localFollowerCount.value !== null) localFollowerCount.value += 1
    else if (profile.value?.followerCount != null) localFollowerCount.value = profile.value.followerCount + 1
  } catch (err) {
    console.error('Follow error:', err)
  } finally {
    profileFollowLoading.value = false
  }
}

function onProfileFollowed() {
  localProfileFollowed.value = true
  if (profile.value?.followerCount != null) localFollowerCount.value = profile.value.followerCount + 1
  else refresh()
}

async function toggleProfileUnfollow() {
  if (!identifier.value || !user.value) return
  if (profileFollowLoading.value) return
  profileFollowLoading.value = true
  try {
    await $fetch(`/api/users/${encodeURIComponent(identifier.value)}/follow`, { method: 'DELETE' })
    localProfileFollowed.value = false
    if (localFollowerCount.value !== null && localFollowerCount.value > 0) localFollowerCount.value -= 1
    else if (profile.value?.followerCount != null) localFollowerCount.value = Math.max(0, profile.value.followerCount - 1)
  } catch (err) {
    console.error('Unfollow error:', err)
  } finally {
    profileFollowLoading.value = false
  }
}

const { data: likesData, pending: likesPending, refresh: refreshLikes } = await useFetch(
  () => (tab.value === 'likes' && identifier.value ? `/api/users/${identifier.value}/likes` : null),
  { query: () => ({ limit: 20, offset: 0 }), immediate: false }
)
watch(likesData, (v) => {
  if (v?.posts) {
    likedPosts.value = v.posts
    likesHasMore.value = v.posts.length === 20
  }
}, { immediate: true })
watch(tab, (t) => {
  if (t === 'likes' && isOwnProfile.value) {
    refreshLikes()
    likesHasMore.value = true
  }
  else {
    refresh()
    hasMore.value = true
  }
})

// Intersection Observerで無限スクロール（投稿一覧）
onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value && tab.value === 'posts') {
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
  
  // いいね一覧用のObserver
  const likesObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && likesHasMore.value && !likesLoadingMore.value && tab.value === 'likes') {
        loadMoreLikes()
      }
    },
    { rootMargin: '100px' }
  )
  
  watch(likesSentinelRef, (newRef) => {
    if (newRef) {
      likesObserver.observe(newRef)
    }
  }, { immediate: true })
  
  onUnmounted(() => {
    if (sentinelRef.value) {
      observer.unobserve(sentinelRef.value)
    }
    if (likesSentinelRef.value) {
      likesObserver.unobserve(likesSentinelRef.value)
    }
    observer.disconnect()
    likesObserver.disconnect()
  })
})

function onLikeToggled(payload: { postId: number; liked: boolean; likeCount: number }, source: 'posts' | 'likes') {
  const list = source === 'posts' ? posts.value : likedPosts.value
  const p = list.find((x: any) => x.id === payload.postId)
  if (p) {
    p.likedByMe = payload.liked
    p.likeCount = payload.likeCount
  }
  if (source === 'likes' && !payload.liked) {
    likedPosts.value = likedPosts.value.filter((x: any) => x.id !== payload.postId)
  }
}

function removePost(postId: number, list: any[]) {
  const index = list.findIndex((p: any) => p.id === postId)
  if (index !== -1) {
    list.splice(index, 1)
  }
}

function incrementCommentCount(postId: number, list: any[]) {
  const p = list.find((x: any) => x.id === postId)
  if (p) p.commentCount = (p.commentCount ?? 0) + 1
}

const editForm = ref({
  handle: '',
  name: '',
  bio: '',
  avatarUrl: ''
})

const editModalOpen = ref(false)
const saving = ref(false)
const profileError = ref('')
const avatarInputRef = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)

const uploadAvatar = useUpload('/api/upload?prefix=avatars', { formKey: 'files', multiple: false })

async function onAvatarSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return
  avatarUploading.value = true
  profileError.value = ''
  try {
    const result = await uploadAvatar(target) as { pathname: string }
    if (result?.pathname) {
      editForm.value.avatarUrl = `/images/${result.pathname}`
    }
  } catch (e: any) {
    profileError.value = e.data?.message || '画像のアップロードに失敗しました'
  } finally {
    avatarUploading.value = false
    target.value = ''
  }
}

function clearAvatar() {
  editForm.value.avatarUrl = ''
  if (avatarInputRef.value) avatarInputRef.value.value = ''
}

function openEditModal() {
  resetEditForm()
  editModalOpen.value = true
}

watch(profile, (p) => {
  if (p) {
    editForm.value = {
      handle: p.handle ?? '',
      name: p.name,
      bio: p.bio ?? '',
      avatarUrl: p.avatarUrl ?? ''
    }
  }
}, { immediate: true })

watch(data, (v) => {
  if (v?.posts) {
    posts.value = v.posts
    hasMore.value = v.posts.length === 20
  }
}, { immediate: true })

const errorMessage = computed(() => {
  if (!error.value) return ''
  const e = error.value
  if (e.data?.message) return e.data.message
  if (e.statusCode === 404) return 'ユーザーが見つかりません'
  return '読み込みに失敗しました'
})

function resetEditForm() {
  if (profile.value) {
    editForm.value = {
      handle: profile.value.handle ?? '',
      name: profile.value.name,
      bio: profile.value.bio ?? '',
      avatarUrl: profile.value.avatarUrl ?? ''
    }
  }
  profileError.value = ''
}

async function saveProfile() {
  if (!user.value || !profile.value) return

  saving.value = true
  profileError.value = ''

  try {
    const res = await $fetch<{ success: boolean; user: { id: string; handle?: string | null; name: string; bio?: string; avatarUrl?: string } }>('/api/auth/profile', {
      method: 'PATCH',
      body: {
        handle: editForm.value.handle.trim() || undefined,
        name: editForm.value.name.trim(),
        bio: editForm.value.bio.trim() || undefined,
        avatarUrl: editForm.value.avatarUrl.trim() || undefined
      }
    })

    await fetchUser()

    const newHandle = res.user.handle ?? null
    const oldHandle = profile.value.handle ?? null

    editModalOpen.value = false

    if (newHandle && newHandle !== identifier.value) {
      await navigateTo(`/users/${newHandle}`, { replace: true })
      await refresh()
    } else if (!newHandle && oldHandle && identifier.value === oldHandle) {
      await navigateTo(`/users/${res.user.id}`, { replace: true })
      await refresh()
    } else {
      await refresh()
    }
  } catch (err: any) {
    profileError.value = err.data?.message || '保存に失敗しました'
  } finally {
    saving.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  
  loadingMore.value = true
  try {
    const res = await $fetch<{ posts: any[] }>(`/api/users/${identifier.value}`, {
      query: { limit: 20, offset: posts.value.length }
    })
    if (res.posts?.length) {
      posts.value.push(...res.posts)
      hasMore.value = res.posts.length === 20
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

async function loadMoreLikes() {
  if (!identifier.value || likesLoadingMore.value || !likesHasMore.value) return
  
  likesLoadingMore.value = true
  try {
    const res = await $fetch<{ posts: any[] }>(`/api/users/${identifier.value}/likes`, {
      query: { limit: 20, offset: likedPosts.value.length }
    })
    if (res.posts?.length) {
      likedPosts.value.push(...res.posts)
      likesHasMore.value = res.posts.length === 20
    } else {
      likesHasMore.value = false
    }
  } catch (err) {
    console.error('いいね投稿の読み込みエラー:', err)
    likesHasMore.value = false
  } finally {
    likesLoadingMore.value = false
  }
}
</script>
