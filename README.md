# ONIGIRI 🍙

飲食店の口コミに特化したSNSアプリケーション

## 機能

- ✅ ユーザー認証（登録・ログイン・ログアウト）
- ✅ 投稿機能（テキスト・画像・カテゴリ）
- ✅ タイムライン表示
- ✅ カテゴリフィルター（和食・洋食・中華など）
- ✅ レスポンシブデザイン

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. データベースの初期化

開発サーバーを起動すると、NuxtHub が **マイグレーションを自動適用** します（テーブル自動作成）：

```bash
npm run dev
```

起動後、別ターミナルで **初期カテゴリデータ** だけ投入してください（ポートは起動ログの表示に合わせて 3000 や 3001 に変更）：

```bash
curl -X POST http://localhost:3000/api/db/seed
```

スキーマを変更した場合は `npx nuxt db generate` でマイグレーションを再生成し、開発サーバーを再起動してください。

### 3. アプリケーションの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 使い方

1. **アカウント作成**: `/login` ページで「新規登録」タブからアカウントを作成
2. **ログイン**: メールアドレスとパスワードでログイン
3. **投稿**: タイムラインページで投稿フォームから投稿を作成
4. **タイムライン閲覧**: カテゴリフィルターで投稿を絞り込み

## 技術スタック

- **フロントエンド**: Nuxt 4, Vue 3, Nuxt UI
- **バックエンド**: NuxtHub (Cloudflare Workers)
- **データベース**: Cloudflare D1 (SQLite)
- **ストレージ**: Cloudflare R2 (Blob Storage)
- **認証**: セッション管理（KV Storage）

## プロジェクト構造

```
onigiri/
├── app/
│   ├── components/      # Vueコンポーネント
│   │   ├── PostCard.vue
│   │   └── PostForm.vue
│   ├── composables/      # Composables
│   │   └── useAuth.ts
│   ├── layouts/          # レイアウト
│   ├── pages/            # ページ
│   │   ├── index.vue     # タイムライン
│   │   └── login.vue     # ログイン/登録
│   └── app.vue
├── server/
│   ├── api/              # APIエンドポイント
│   │   ├── auth/         # 認証API
│   │   ├── db/           # データベース管理
│   │   └── posts.get.ts  # 投稿取得
│   └── utils/            # ユーティリティ
│       └── auth.ts       # 認証ヘルパー
└── nuxt.config.ts
```

## デプロイ

NuxtHubを使用してCloudflareにデプロイ：

```bash
npx nuxthub deploy
```

## データベーススキーマ

### users
- id (TEXT, PRIMARY KEY)
- name (TEXT)
- avatarUrl (TEXT)
- bio (TEXT)
- createdAt (INTEGER)

### categories
- id (INTEGER, PRIMARY KEY)
- name (TEXT, UNIQUE)
- createdAt (INTEGER)

### posts
- id (INTEGER, PRIMARY KEY)
- userId (TEXT, FOREIGN KEY)
- content (TEXT)
- imageUrl (TEXT)
- categoryId (INTEGER, FOREIGN KEY)
- shopId (TEXT, FOREIGN KEY)
- replyToId (INTEGER, FOREIGN KEY)
- repostOfId (INTEGER, FOREIGN KEY)
- createdAt (INTEGER)

### shops
- id (TEXT, PRIMARY KEY)
- name (TEXT)
- address (TEXT)
- placeId (TEXT)
- latitude (REAL)
- longitude (REAL)
- createdAt (INTEGER)

### user_credentials
- userId (TEXT, PRIMARY KEY)
- email (TEXT, UNIQUE)
- passwordHash (TEXT)

## ライセンス

MIT