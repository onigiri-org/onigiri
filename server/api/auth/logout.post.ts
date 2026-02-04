// ログアウトAPI

export default eventHandler(async (event) => {
  const { deleteSession } = await import('../../utils/auth')
  await deleteSession(event)

  return {
    success: true,
    message: 'ログアウトしました'
  }
})
