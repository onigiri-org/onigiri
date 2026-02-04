// Blob に保存した画像を配信するルート

export default eventHandler(async (event) => {
  const path = getRouterParam(event, 'pathname')
  if (!path) {
    throw createError({ statusCode: 400, message: 'pathname required' })
  }
  return blob.serve(event, path)
})
