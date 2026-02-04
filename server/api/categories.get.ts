// カテゴリ一覧取得API

export default eventHandler(async () => {
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.id)
  return {
    categories
  }
})
