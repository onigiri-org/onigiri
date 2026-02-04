<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <div class="flex flex-col items-center justify-center gap-2 mb-2">
            <OnigiriIcon :size="32" :white-background="true" class="text-primary" />
            <h1 class="text-2xl font-bold">ONIGIRI</h1>
          </div>
          <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">飲食店の口コミSNS</p>
        </div>
      </template>

      <UTabs v-model="tab" :items="tabs" class="w-full">
        <template #content="{ item }">
          <div v-if="item.value === 'login'" class="space-y-4 pt-4">
            <UFormField label="メールアドレス">
              <UInput
                v-model="loginForm.email"
                type="email"
                placeholder="example@email.com"
                size="md"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="パスワード">
              <UInput
                v-model="loginForm.password"
                type="password"
                placeholder="6文字以上"
                size="md"
                class="w-full"
                required
              />
            </UFormField>

            <UButton
              block
              :loading="loading"
              size="md"
              @click="handleLogin"
            >
              ログイン
            </UButton>

            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              :title="error"
              class="mt-4"
            />
          </div>

          <div v-else class="space-y-4 pt-4">
            <UFormField label="名前">
              <UInput
                v-model="registerForm.name"
                placeholder="山田太郎"
                size="md"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="メールアドレス">
              <UInput
                v-model="registerForm.email"
                type="email"
                placeholder="example@email.com"
                size="md"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="パスワード">
              <UInput
                v-model="registerForm.password"
                type="password"
                placeholder="6文字以上"
                size="md"
                class="w-full"
                required
              />
            </UFormField>

            <UButton
              block
              :loading="loading"
              size="md"
              @click="handleRegister"
            >
              アカウント作成
            </UButton>

            <UAlert
              v-if="error"
              color="error"
              variant="soft"
              :title="error"
              class="mt-4"
            />
          </div>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const { login, register } = useAuth()
const router = useRouter()

const tab = ref('login')

useHead({
  title: computed(() => {
    return tab.value === 'login' ? 'ログイン | ONIGIRI' : '新規登録 | ONIGIRI'
  })
})
const tabs = [
  { label: 'ログイン', value: 'login' },
  { label: '新規登録', value: 'register' }
]

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  name: '',
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!loginForm.email || !loginForm.password) {
    error.value = 'メールアドレスとパスワードを入力してください'
    return
  }

  loading.value = true
  error.value = ''

  const result = await login(loginForm.email, loginForm.password)

  if (result.success) {
    await router.push('/')
  } else {
    error.value = result.error || 'ログインに失敗しました'
  }

  loading.value = false
}

const handleRegister = async () => {
  if (!registerForm.name || !registerForm.email || !registerForm.password) {
    error.value = 'すべての項目を入力してください'
    return
  }

  if (registerForm.password.length < 6) {
    error.value = 'パスワードは6文字以上である必要があります'
    return
  }

  loading.value = true
  error.value = ''

  const result = await register(registerForm.name, registerForm.email, registerForm.password)

  if (result.success) {
    await router.push('/')
  } else {
    error.value = result.error || '登録に失敗しました'
  }

  loading.value = false
}
</script>
