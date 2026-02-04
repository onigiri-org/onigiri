<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
      <UFormField label="投稿内容" :hint="`${content.length}/500文字`">
        <UTextarea
          v-model="content"
          :rows="4"
          placeholder="今のご飯どうだった？"
          :maxlength="500"
          size="md"
          class="w-full"
        />
      </UFormField>

      <UFormField label="画像（任意・最大4枚）">
        <div class="space-y-2">
          <input
            ref="imageInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-medium hover:file:opacity-90"
            @change="onImageSelect"
          >
          <p v-if="imageUploading" class="text-sm text-gray-500">
            アップロード中...
          </p>
          <div v-if="imageUrls.length" class="flex flex-wrap gap-2 mt-2">
            <div
              v-for="(url, index) in imageUrls"
              :key="url"
              class="relative"
            >
              <img
                :src="url"
                :alt="`プレビュー ${index + 1}`"
                class="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              >
              <button
                type="button"
                class="absolute -top-1 -right-1 rounded-full bg-gray-800 text-white p-0.5 hover:bg-gray-700"
                aria-label="削除"
                @click="removeImage(index)"
              >
                <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </UFormField>

      <UFormField label="タグ（任意・最大5個）" hint="タグを入力して Enter で追加">
        <div class="flex flex-wrap items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
          <span
            v-for="(tag, index) in tags"
            :key="index"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm"
          >
            {{ tag }}
            <button
              type="button"
              class="ml-0.5 rounded hover:bg-primary/20 p-0.5"
              aria-label="タグを削除"
              @click="removeTag(index)"
            >
              <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
            </button>
          </span>
          <input
            v-if="tags.length < 5"
            ref="tagInputRef"
            v-model="tagInput"
            type="text"
            class="flex-1 min-w-[120px] px-2 py-1 bg-transparent border-0 outline-none text-sm"
            placeholder="タグを入力..."
            maxlength="30"
            @keydown.enter.prevent="addTag"
          >
        </div>
      </UFormField>

      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          size="md"
          @click="reset"
        >
          キャンセル
        </UButton>
        <UButton
          type="submit"
          :loading="loading"
          :disabled="!content.trim()"
          size="md"
        >
          投稿する
        </UButton>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
      />
    </form>
</template>

<script setup lang="ts">
const { user } = useAuth()
const emit = defineEmits<{
  posted: []
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

const uploadImages = useUpload('/api/upload', { formKey: 'files', multiple: true })

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
    const result = await uploadImages(target)
    const list = Array.isArray(result) ? result : result ? [result] : []
    const pathnames = list
      .slice(0, remaining)
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
  reset
})
</script>
