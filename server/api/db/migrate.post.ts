// NuxtHub v0.10 ではマイグレーションは npx nuxt db generate で生成し、
// 開発サーバー起動時または npx nuxt db migrate で自動適用されます。
// このAPIは互換用に残してあります。

export default eventHandler(() => {
  return {
    success: true,
    message: 'マイグレーションは NuxtHub により自動管理されています。テーブル作成は npx nuxt dev または npx nuxt db migrate で適用されます。'
  }
})
