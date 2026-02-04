// 認証関連のcomposable

export interface User {
  id: string
  handle?: string | null
  name: string
  avatarUrl?: string
  bio?: string
  createdAt: number
}

export const useAuth = () => {
  const user = useState<User | null>('auth.user', () => null)

  // 現在のユーザー情報を取得
  const fetchUser = async () => {
    try {
      const data = await $fetch<{ user: User }>('/api/auth/me')
      user.value = data.user
      return data.user
    } catch (error) {
      user.value = null
      return null
    }
  }

  // ログイン
  const login = async (email: string, password: string) => {
    try {
      const data = await $fetch<{ success: boolean; user: User }>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      user.value = data.user
      return { success: true, user: data.user }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || 'ログインに失敗しました'
      }
    }
  }

  // 登録
  const register = async (name: string, email: string, password: string) => {
    try {
      const data = await $fetch<{ success: boolean; user: User }>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password }
      })
      user.value = data.user
      return { success: true, user: data.user }
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || '登録に失敗しました'
      }
    }
  }

  // ログアウト
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      await navigateTo('/login')
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  // 初期化時にユーザー情報を取得
  if (process.client && !user.value) {
    fetchUser()
  }

  return {
    user: readonly(user),
    fetchUser,
    login,
    register,
    logout
  }
}
