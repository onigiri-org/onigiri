export default defineNuxtRouteMiddleware(async (to, from) => {
  console.log('auth middleware called', { to: to.path, from: from?.path })
  
  // ログインページの場合は認証チェックをスキップ
  if (to.path === '/login') {
    console.log('Skipping auth check for login page')
    return
  }

  // クライアントサイドでのみ認証チェックを実行
  if (process.server) {
    console.log('Skipping auth check on server')
    return
  }

  const { user, fetchUser } = useAuth()
  
  try {
    // 既にユーザー情報がある場合はスキップ
    if (user.value) {
      console.log('User already authenticated, skipping')
      return
    }
    
    console.log('Fetching user...')
    // ユーザー情報を取得
    await fetchUser()
    console.log('User fetched:', user.value)
    
    // ユーザーがログインしていない場合はログインページへリダイレクト
    if (!user.value) {
      console.log('User not authenticated, redirecting to login')
      return navigateTo('/login')
    }
    console.log('Auth check passed')
  } catch (error) {
    // エラーが発生した場合もログインページへリダイレクト
    console.error('認証エラー:', error)
    return navigateTo('/login')
  }
})
