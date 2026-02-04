# Cloudflareへのデプロイ手順

## 重要: NuxtHub v0.10の変更について

NuxtHub v0.10では、マルチベンダー対応によりデプロイ方法が変更されました。

- **2025年12月31日**: NuxtHub AdminとCLIはサンセットされます
- **現在**: NuxtHub Adminでの新規プロジェクト作成は既に停止されています
- **推奨方法**: Cloudflare Workers Builds（Wrangler CLI）を使用した直接デプロイ

**注意**: `npm run deploy:legacy`（`npx nuxthub deploy`）は新規プロジェクト作成時にエラーになります。このドキュメントでは、Wrangler CLIを使用した直接デプロイ方法を説明します。

## 前提条件

1. **Cloudflareアカウント**が必要です（無料で作成可能）
   - [Cloudflare Dashboard](https://dash.cloudflare.com/)でアカウント作成

2. **Node.js**がインストールされていること

3. **Wrangler CLI**がインストールされていること（`package.json`の`devDependencies`に含まれています）

## リソースの手動作成（オプション）

初回デプロイ前に手動でリソースを作成することもできます：

### D1データベースの作成

```bash
npx wrangler d1 create onigiri-db
```

実行すると、以下のような出力が表示されます：
```
✅ Successfully created DB 'onigiri-db'!

[[d1_databases]]
binding = "DB"
database_name = "onigiri-db"
database_id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # ← このIDをコピー
```

### R2バケットの作成

```bash
npx wrangler r2 bucket create onigiri-blob
```

### KV名前空間の作成

```bash
npx wrangler kv namespace create "KV"
```

実行すると、以下のような出力が表示されます：
```
✅  Successfully created namespace "KV" with id "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7"  # ← このIDをコピー
```

作成後、取得したIDを`wrangler.jsonc`に設定してください。

## デプロイ手順

**重要**: NuxtHub Adminは新規プロジェクト作成を停止しています（2025年12月31日シャットダウン）。以下の方法で直接デプロイしてください。

### 方法A: Wrangler CLIで直接デプロイ（推奨）

#### 1. Wrangler CLIでログイン

```bash
npx wrangler login
```

ブラウザが開き、Cloudflareアカウントで認証します。

#### 2. リソースの作成

まず、必要なリソース（D1、R2、KV）を手動で作成します：

**D1データベースの作成:**

```bash
npx wrangler d1 create onigiri-db
```

実行すると、以下のような出力が表示されます。**database_idをコピー**してください：

```
✅ Successfully created DB 'onigiri-db'!

[[d1_databases]]
binding = "DB"
database_name = "onigiri-db"
database_id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  # ← このIDをコピー
```

**R2バケットの作成:**

```bash
npx wrangler r2 bucket create onigiri-blob
```

**KV名前空間の作成:**

```bash
npx wrangler kv namespace create "KV"
```

実行すると、以下のような出力が表示されます。**idをコピー**してください：

```
✅  Successfully created namespace "KV" with id "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7"  # ← このIDをコピー
```

#### 3. wrangler.jsoncの設定

取得したリソースIDを`wrangler.jsonc`に設定します。コメントアウトを解除して、実際のIDに置き換えてください：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "onigiri",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".output/server/index.mjs",
  "assets": {
    "directory": ".output/public",
    "binding": "ASSETS"
  },
  // D1データベース（コメントアウトを解除してIDを設定）
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "onigiri-db",
      "database_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  // ← 実際のIDに置き換え
    }
  ],
  // R2バケット（コメントアウトを解除してバケット名を設定）
  "r2_buckets": [
    {
      "binding": "BLOB",
      "bucket_name": "onigiri-blob"  // ← 実際のバケット名に置き換え
    }
  ],
  // KV名前空間（コメントアウトを解除してIDを設定）
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7"  // ← 実際のIDに置き換え
    }
  ]
}
```

#### 4. ビルドとデプロイ

```bash
npm run deploy
```

これで、Cloudflare Workersにデプロイされます。

#### 5. データベースのマイグレーション

デプロイ後、本番環境のデータベースにマイグレーションを適用します：

```bash
# デプロイされたURLにマイグレーションを適用
curl -X POST https://onigiri.workers.dev/api/db/migrate
```

または、Wrangler CLIから直接実行：

```bash
npx wrangler d1 execute onigiri-db --file=./server/db/migrations/0000_*.sql
```

### 方法B: Cloudflare Dashboardでリソースを作成する場合

Wrangler CLIの代わりに、Cloudflare Dashboardでリソースを作成することもできます：

#### 3. リソースIDとは？

**リソースID**は、Cloudflare上で作成された各リソース（D1データベース、R2バケット、KV名前空間）を識別するための一意のIDです。

- **D1データベースID**: SQLiteデータベースを識別するID（例: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）
- **R2バケット名**: オブジェクトストレージのバケット名（例: `onigiri-blob`）
- **KV名前空間ID**: Key-Valueストレージの名前空間ID（例: `b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7`）

#### 4. リソースIDの取得方法

##### 方法A: Cloudflare Dashboardで確認（推奨）

**D1データベースIDの取得:**

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左メニューから **Workers & Pages** → **D1** を選択
3. 作成されたデータベース（例: `onigiri-db`）をクリック
4. **Settings** タブで **Database ID** をコピー

**R2バケット名の取得:**

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左メニューから **R2** を選択
3. 作成されたバケット名を確認（例: `onigiri-blob`）

**KV名前空間IDの取得:**

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左メニューから **Workers & Pages** → **KV** を選択
3. 作成された名前空間をクリック
4. **Settings** タブで **Namespace ID** をコピー

##### 方法B: Wrangler CLIで確認

```bash
# D1データベース一覧
npx wrangler d1 list

# R2バケット一覧
npx wrangler r2 bucket list

# KV名前空間一覧
npx wrangler kv namespace list
```

#### 5. wrangler.jsoncへの設定

取得したリソースIDを`wrangler.jsonc`に設定します：

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "onigiri",
  "compatibility_date": "2025-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": ".output/server/index.mjs",
  "assets": {
    "directory": ".output/public",
    "binding": "ASSETS"
  },
  // D1データベース（コメントアウトを解除してIDを設定）
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "onigiri-db",
      "database_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"  // ← 実際のIDに置き換え
    }
  ],
  // R2バケット（コメントアウトを解除してバケット名を設定）
  "r2_buckets": [
    {
      "binding": "BLOB",
      "bucket_name": "onigiri-blob"  // ← 実際のバケット名に置き換え
    }
  ],
  // KV名前空間（コメントアウトを解除してIDを設定）
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7"  // ← 実際のIDに置き換え
    }
  ]
}
```

**注意**: 
- `database_id`と`id`（KV）は、Cloudflareが自動生成する長い文字列です
- `bucket_name`は、作成時に指定した名前または自動生成された名前です
- コメントアウト（`//`）を削除して、実際の値に置き換えてください

### 方法C: 通常のデプロイ（リソースID設定済み）

`wrangler.jsonc`にリソースIDが設定済みの場合：

#### 1. Wrangler CLIでログイン（初回のみ）

```bash
npx wrangler login
```

#### 2. ビルドとデプロイ

```bash
npm run deploy
```

このコマンドは以下を実行します：
- `npm run build` - プロジェクトをビルド
- `wrangler deploy` - Cloudflare Workersにデプロイ

### 方法D: Cloudflare Workers Builds（GitHub連携）（推奨）

Cloudflare DashboardのWorkers Builds機能を使用して、GitHub/GitLabリポジトリと連携し、自動ビルド・デプロイを設定できます。

**詳細な手順**: `WORKERS_BUILDS_SETUP.md`を参照してください。

#### 簡単な手順

1. **GitHub/GitLabリポジトリにコードをプッシュ**
2. **Cloudflare Dashboardで設定**:
   - [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
   - **Workers & Pages** → **Create application** → **Import a repository**
   - Gitアカウントを認証し、リポジトリを選択
   - プロジェクト設定：
     - **Project name**: `onigiri`（`wrangler.jsonc`の`name`と**完全に一致**させる）
     - **Root directory**: `/`
     - **Build command**: `npm run build`
     - **Deploy command**: `npx wrangler deploy`
   - **Save and Deploy**
3. **ビルドの確認**: **Deployments**タブでビルド履歴とログを確認

**注意**: 
- Worker名は`wrangler.jsonc`の`name`と完全に一致させる必要があります
- 現在、`cloudflare_module` presetでビルドエラーが発生する場合があります。Cloudflare側のビルド環境で成功する可能性があります

## API Tokenが必要な場合

### NuxtHub Admin経由で作成する場合

`npm run deploy:legacy`を実行した際に、以下のメッセージが表示される場合があります：

```
ℹ You need to link your Cloudflare account to the yamakawa team.
ℹ Create a new Cloudflare API token by following this link:
https://admin.hub.nuxt.com/cloudflare-token?name=NuxtHub+Team+yamakawa
```

この場合、以下の手順でAPIトークンを作成してください：

1. 表示されたリンクをクリック（またはブラウザで開く）
2. Cloudflare Dashboardにログイン
3. APIトークンの作成画面で、以下の権限を設定：
   - **Workers Scripts**: Edit
   - **Workers KV Storage**: Edit
   - **D1**: Edit
   - **R2**: Edit
   - **Account Settings**: Read
4. トークンを作成し、コピー
5. ターミナルに戻り、コピーしたトークンを貼り付け

**注意**: NuxtHub Admin経由で作成したトークンは、NuxtHub Adminでのみ使用されます。通常のWrangler CLIデプロイには不要です。

### 手動で作成する場合（CI/CDなど）

CI/CDパイプラインなどでAPI Tokenが必要な場合は、以下の権限が必要です：

#### 必要な権限

1. **Account Permissions（アカウントレベル）**:
   - **Workers Scripts**: Edit（Workersの作成・更新・削除）
   - **Workers KV Storage**: Edit（KVストレージの読み書き）
   - **D1**: Edit（D1データベースの作成・管理）
   - **R2**: Edit（R2ストレージの作成・管理）
   - **Account Settings**: Read（アカウント情報の読み取り）

2. **Zone Permissions（ドメインレベル）** - カスタムドメインを使用する場合:
   - **Zone**: Read（ドメイン情報の読み取り）
   - **DNS**: Edit（DNSレコードの設定）

#### API Tokenの作成方法

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 「My Profile」→「API Tokens」に移動
3. 「Create Token」をクリック
4. 「Edit Cloudflare Workers」テンプレートを使用するか、上記の権限を手動で設定
5. Tokenを作成し、安全に保管（一度しか表示されません）

### 環境変数での設定

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
npm run deploy
```

## デプロイ後の確認

デプロイが成功すると、以下のような出力が表示されます：

```
✓ Deployed to https://your-project-name.workers.dev
```

または、カスタムドメインを設定している場合：

```
✓ Deployed to https://your-domain.com
```

このURLにアクセスしてアプリが動作することを確認してください。

## 環境変数の設定

デプロイ後、Cloudflare Dashboardで環境変数を設定する必要がある場合があります：

### Workersデプロイの場合

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. **Workers & Pages** → プロジェクトを選択
3. **Settings** → **Variables** → **Environment Variables**から設定

### Pagesデプロイ（GitHub連携）の場合

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. **Workers & Pages** → プロジェクトを選択
3. **Settings** → **Environment Variables**から設定

### 設定が必要な環境変数（オプション）

- `VAPID_PRIVATE_KEY`: プッシュ通知用（設定しない場合はプッシュ通知は無効）
- `NUXT_PUBLIC_VAPID_PUBLIC_KEY`: プッシュ通知用（設定しない場合はプッシュ通知は無効）

### wrangler.jsoncでの環境変数設定

`wrangler.jsonc`に直接環境変数を設定することもできます：

```jsonc
{
  "vars": {
    "NUXT_PUBLIC_VAPID_PUBLIC_KEY": "your-public-key"
  }
}
```

**注意**: 機密情報（`VAPID_PRIVATE_KEY`など）は`wrangler.jsonc`に直接書かず、Cloudflare Dashboardで設定してください。

## データベースのマイグレーション

デプロイ後、本番環境のデータベースにマイグレーションを適用する必要があります：

1. デプロイされたアプリのURLにアクセス
2. `/api/db/migrate` エンドポイントにPOSTリクエストを送信

```bash
curl -X POST https://your-project-name.pages.dev/api/db/migrate
```

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラーの確認**
   ```bash
   npm run build
   ```
   エラーがないか確認してください。

2. **依存関係の確認**
   ```bash
   npm install
   ```
   すべての依存関係がインストールされているか確認してください。

3. **Wrangler CLIのバージョン確認**
   ```bash
   npx wrangler --version
   ```
   最新版を使用しているか確認してください。

4. **wrangler.jsoncの設定確認**
   - リソースIDが正しく設定されているか確認
   - JSONの構文エラーがないか確認

### ビルドエラーが発生する場合

**エラー**: `Entry module "node_modules/.pnpm/nuxt@.../dist/app/entry.js" cannot be external`

このエラーは、NuxtHub v0.10.6とNuxt 3.17.5の組み合わせで発生する既知の問題です。

**回避策**:

1. **NuxtHubの最新版にアップデート**:
   ```bash
   npm update @nuxthub/core
   ```

2. **Nitroの設定を削除**:
   `nuxt.config.ts`から`nitro`の設定を削除し、NuxtHubに自動設定を任せます。

3. **一時的な回避策**: `node-server` presetでビルドしてから、手動でWranglerにデプロイ:
   ```bash
   NITRO_PRESET=node-server npm run build
   ```
   ただし、この方法はCloudflare Workersの環境では動作しない可能性があります。

4. **NuxtHubのGitHubリポジトリで報告**:
   この問題が続く場合は、[NuxtHubのGitHubリポジトリ](https://github.com/nuxt-hub/core)でissueを報告してください。

### データベースが動作しない場合

- `wrangler.jsonc`の`d1_databases`設定を確認してください
- マイグレーションが適用されているか確認してください：
  ```bash
  curl -X POST https://your-project-name.workers.dev/api/db/migrate
  ```

### 画像アップロードが動作しない場合

- `wrangler.jsonc`の`r2_buckets`設定を確認してください
- R2バケットが正しく作成されているかCloudflare Dashboardで確認してください

### KVストレージが動作しない場合

- `wrangler.jsonc`の`kv_namespaces`設定を確認してください
- KV名前空間が正しく作成されているかCloudflare Dashboardで確認してください

## 本番環境での注意事項

1. **HTTPS**: Cloudflare Workers/Pagesは自動的にHTTPSを提供します
2. **PWA**: HTTPS環境でPWAとプッシュ通知が動作します
3. **データベース**: Cloudflare D1は無料枠で使用可能です
4. **ストレージ**: Cloudflare R2は無料枠で使用可能です
5. **KVストレージ**: Cloudflare KVは無料枠で使用可能です

## 移行に関する注意事項

### NuxtHub Adminからの移行

既存のNuxtHub Adminプロジェクトを移行する場合：

1. **NuxtHub Admin**でマイグレーションツールを使用
2. リソースIDを取得して`wrangler.jsonc`に設定
3. 以降は`npm run deploy`でデプロイ

### 2025年12月31日以降

- NuxtHub AdminとCLIはサンセットされます
- `npx nuxthub deploy`は動作しなくなります
- `npm run deploy`（Wrangler CLI）またはGitHub連携を使用してください

**推奨**: できるだけ早くWrangler CLIへの移行を完了してください。

## 参考リンク

- [NuxtHub v0.10 マルチベンダー対応](https://hub.nuxt.com/changelog/nuxthub-multi-vendor)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
