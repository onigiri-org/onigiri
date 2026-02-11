<template>
  <div class="flex flex-col h-full sm:h-auto min-h-0 bg-white dark:bg-gray-900 overflow-hidden">
    <!-- フォーム本体 -->
    <form
      id="post-form"
      @submit.prevent="handleSubmit"
      class="flex-1 flex flex-col overflow-hidden min-h-0"
    >
      <div class="flex-1 px-4 py-4 sm:px-6 overflow-hidden">
        <div class="flex gap-3 sm:gap-4">
          <!-- ユーザーアバター -->
          <div class="flex-shrink-0">
            <img
              v-if="user?.avatarUrl"
              :src="user.avatarUrl"
              :alt="user.name"
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
            >
            <div
              v-else
              class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center"
            >
              <UIcon name="i-lucide-user" class="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </div>
          </div>

          <!-- 入力エリア -->
          <div class="flex-1 min-w-0">
            <!-- テキストエリア -->
            <textarea
              v-model="content"
              :rows="isMobile ? 10 : 6"
              placeholder="今のご飯どうだった？"
              :maxlength="500"
              class="w-full resize-none border-0 bg-transparent text-lg sm:text-xl placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 pb-safe"
              style="min-height: 150px;"
            />
            <div class="text-right text-sm text-gray-500 dark:text-gray-400 mt-2">
              {{ content.length }}/500
            </div>
          </div>
        </div>

        <!-- タグ表示と入力（全幅表示） -->
        <div class="mt-4">
          <div v-if="tags.length" class="flex flex-wrap gap-2 mb-2">
            <span
              v-for="(tag, index) in tags"
              :key="index"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
            >
              {{ tag }}
              <button
                type="button"
                class="rounded-full hover:bg-primary/20 p-0.5"
                aria-label="タグを削除"
                @click="removeTag(index)"
              >
                <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <!-- タグ入力 -->
          <div v-if="tags.length < 5">
            <input
              ref="tagInputRef"
              v-model="tagInput"
              type="text"
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="タグを入力して Enter で追加"
              maxlength="30"
              @keydown.enter.prevent="addTag"
            >
          </div>
        </div>

        <!-- 画像プレビュー（全幅表示） -->
        <div v-if="imageUrls.length" class="mt-4 grid gap-2" :class="getImageGridClass(imageUrls.length)">
              <div
                v-for="(url, index) in imageUrls"
                :key="url"
                class="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"
              >
                <img
                  :src="url"
                  :alt="`プレビュー ${index + 1}`"
                  class="w-full h-full object-cover"
                  :class="getImageClass(imageUrls.length, index)"
                >
                <button
                  type="button"
                  class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="削除"
                  @click="removeImage(index)"
                >
                  <UIcon name="i-lucide-x" class="w-4 h-4" />
                </button>
              </div>
        </div>

        <!-- エラー表示（全幅表示） -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          class="mt-4"
        />
      </div>

      <!-- フッター（ツールバー） -->
      <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 flex-shrink-0">
        <div class="flex items-center justify-between">
          <!-- 左側：画像・タグ追加ボタン -->
          <div class="flex items-center gap-4">
            <!-- 画像追加 -->
            <label class="cursor-pointer">
              <input
                ref="imageInputRef"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                class="hidden"
                @change="onImageSelect"
              >
              <UIcon
                name="i-lucide-image"
                class="w-5 h-5 text-primary hover:text-primary/80 transition-colors"
                :class="{ 'opacity-50 cursor-not-allowed': imageUrls.length >= MAX_IMAGES }"
              />
            </label>
            <p v-if="imageUploading" class="text-sm text-gray-500">
              アップロード中...
            </p>
          </div>

          <!-- 右側：文字数カウント（デスクトップのみ） -->
          <div class="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
            {{ content.length }}/500
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const emit = defineEmits<{
  posted: []
  cancelled: []
}>()

const MAX_TAGS = 5
const tags = ref<string[]>([])
const tagInput = ref('')
const tagInputRef = ref<HTMLInputElement | null>(null)
const MAX_IMAGES = 4
const content = ref('')
const imageUrls = ref<string[]>([])
const imageInputRef = ref<HTMLInputElement | null>(null)
const imageUploading = ref(false)
const loading = ref(false)
const error = ref('')

// モバイル判定
const isMobile = computed(() => {
  if (process.client) {
    return window.innerWidth < 640
  }
  return false
})

// 画像グリッドのクラスを決定
function getImageGridClass(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-2'
  return 'grid-cols-2'
}

// 画像のクラスを決定
function getImageClass(count: number, index: number): string {
  if (count === 1) return 'aspect-video'
  if (count === 2) return 'aspect-video'
  if (count === 3) {
    if (index === 0) return 'aspect-video row-span-2'
    return 'aspect-video'
  }
  return 'aspect-video'
}

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (tags.value.length >= MAX_TAGS) return
  if (tags.value.includes(t)) {
    tagInput.value = ''
    return
  }
  tags.value = [...tags.value, t]
  tagInput.value = ''
  nextTick(() => tagInputRef.value?.focus())
}

function removeTag(index: number) {
  tags.value = tags.value.filter((_tag: string, i: number) => i !== index)
}

// 画像をリサイズする関数（1920x1920を超える場合）
async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // 1920x1920以下の場合はそのまま返す
        if (img.width <= 1920 && img.height <= 1920) {
          resolve(file)
          return
        }

        // アスペクト比を維持してリサイズ
        let width = img.width
        let height = img.height
        const maxSize = 1920

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        // Canvasでリサイズ
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Blobに変換
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to resize image'))
              return
            }
            // 元のファイル名とMIMEタイプを維持
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          },
          file.type,
          0.9 // 品質（0.9 = 90%）
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function onImageSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (!files.length) return
  const remaining = MAX_IMAGES - imageUrls.value.length
  if (remaining <= 0) {
    target.value = ''
    return
  }
  imageUploading.value = true
  error.value = ''
  try {
    // 画像をリサイズ
    const filesToUpload = files.slice(0, remaining)
    const resizedFiles = await Promise.all(filesToUpload.map(file => resizeImage(file)))

    // FormDataを作成してリサイズ後の画像をアップロード
    const formData = new FormData()
    resizedFiles.forEach(file => {
      formData.append('files', file)
    })

    // FormDataを送信（fetch APIを直接使用）
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'アップロードに失敗しました' }))
      throw new Error(errorData.message || 'アップロードに失敗しました')
    }

    const result = await response.json() as { pathname: string } | { pathname: string }[]

    const list = Array.isArray(result) ? result : result ? [result] : []
    const pathnames = list
      .map((item: { pathname?: string }) => item?.pathname)
      .filter(Boolean) as string[]
    const newUrls = pathnames.map(p => `/images/${p}`)
    imageUrls.value = [...imageUrls.value, ...newUrls].slice(0, MAX_IMAGES)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string; statusCode?: number }
    error.value = err?.data?.message ?? err?.message ?? '画像のアップロードに失敗しました'
    console.error('Upload error:', err)
  } finally {
    imageUploading.value = false
    target.value = ''
  }
}

function removeImage(index: number) {
  imageUrls.value = imageUrls.value.filter((_url: string, i: number) => i !== index)
}

const reset = () => {
  content.value = ''
  tags.value = []
  tagInput.value = ''
  imageUrls.value = []
  error.value = ''
  if (imageInputRef.value) imageInputRef.value.value = ''
}

const handleCancel = () => {
  reset()
  emit('cancelled')
}

const handleSubmit = async () => {
  if (!content.value.trim()) {
    error.value = '投稿内容を入力してください'
    return
  }

  if (!user.value) {
    error.value = 'ログインが必要です'
    await navigateTo('/login')
    return
  }

  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/posts', {
      method: 'POST',
      body: {
        content: content.value,
        tags: tags.value,
        imageUrls: imageUrls.value.length ? imageUrls.value : undefined
      }
    })

    reset()
    emit('posted')
  } catch (err: any) {
    error.value = err.data?.message || '投稿に失敗しました'
  } finally {
    loading.value = false
  }
}

defineExpose({
  reset,
  loading,
  content
})
</script>
