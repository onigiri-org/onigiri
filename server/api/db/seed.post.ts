// 初期カテゴリデータ投入API

const CATEGORY_NAMES = ['和食', '洋食', '中華', 'カフェ', 'ラーメン', '焼肉', '居酒屋', 'その他']

export default eventHandler(async () => {
  const now = Date.now()
  const existing = await db.select({ name: schema.categories.name }).from(schema.categories)
  const existingNames = new Set(existing.map((c) => c.name))

  for (const name of CATEGORY_NAMES) {
    if (!existingNames.has(name)) {
      await db.insert(schema.categories).values({ name, createdAt: now })
    }
  }

  return {
    success: true,
    message: '初期カテゴリデータの投入が完了しました',
    categories: CATEGORY_NAMES
  }
})
