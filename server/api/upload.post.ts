// 画像アップロードAPI（投稿・アバター用）。認証必須。

export default eventHandler(async (event) => {
  const { getUserFromSession } = await import('../utils/auth')
  const user = await getUserFromSession(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    })
  }

  const query = getQuery(event)
  const prefix = (query.prefix as string) || 'images'

  return blob.handleUpload(event, {
    formKey: 'files',
    multiple: true,
    ensure: {
      maxSize: '5MB',
      types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    },
    put: {
      addRandomSuffix: true,
      prefix: prefix === 'avatars' ? 'avatars' : 'images'
    }
  })
})
