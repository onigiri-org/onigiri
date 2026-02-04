# Cloudflare Workers Builds セットアップ手順

このドキュメントでは、Cloudflare DashboardのWorkers Builds機能を使用して、GitHub/GitLabリポジトリと連携し、自動ビルド・デプロイを設定する手順を説明します。

## 前提条件

1. **GitHubまたはGitLabアカウント**が必要です
2. **Cloudflareアカウント**が必要です（無料で作成可能）
3. **リポジトリにコードがプッシュされている**こと

## ステップ1: GitHub/GitLabリポジトリの準備

### 1.1 リポジトリの作成

まだリポジトリがない場合：

1. GitHubまたはGitLabにログイン
2. 新しいリポジトリを作成（例: `onigiri`）
3. リポジトリをローカルにクローン

### 1.2 コードのプッシュ

プロジェクトのコードをリポジトリにプッシュします：

```bash
# リポジトリを初期化（まだの場合）
git init

# リモートリポジトリを追加
git remote add origin https://github.com/your-username/onigiri.git

# ファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# プッシュ
git push -u origin main
```

**重要**: 以下のファイルがリポジトリに含まれていることを確認してください：
- `wrangler.jsonc`
- `package.json`
- `nuxt.config.ts`
- その他のプロジェクトファイル

## ステップ2: Cloudflare DashboardでWorkers Buildsを設定

### 2.1 Cloudflare Dashboardにアクセス

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. 左メニューから **Workers & Pages** を選択
3. **Create application** をクリック

### 2.2 リポジトリをインポート

1. **Import a repository** の横にある **Get started** をクリック
2. **Git account** を選択（GitHubまたはGitLab）
3. 初回の場合、Gitアカウントを認証（OAuth認証）
4. リポジトリ一覧から **onigiri** を選択
5. **Begin setup** をクリック

### 2.3 プロジェクト設定

以下の設定を行います：

#### 基本設定

- **Project name**: `onigiri`
  - ⚠️ **重要**: `wrangler.jsonc`の`name`フィールドと**完全に一致**させる必要があります
- **Root directory**: `/`（プロジェクトルート）
- **Production branch**: `main`（または`master`）

#### ビルド設定

- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

#### 環境変数（オプション）

必要に応じて環境変数を設定：

- `VAPID_PRIVATE_KEY`: プッシュ通知用（機密情報）
- `NUXT_PUBLIC_VAPID_PUBLIC_KEY`: プッシュ通知用

**注意**: 機密情報は**Environment variables**セクションで設定してください。`wrangler.jsonc`には直接書かないでください。

### 2.4 設定を保存

1. 設定を確認
2. **Save and Deploy** をクリック

## ステップ3: ビルドの確認

### 3.1 ビルド履歴の確認

1. **Workers & Pages** → **onigiri** を選択
2. **Deployments** タブを開く
3. **View build history** をクリック
4. ビルドの状態を確認：
   - ✅ **Success**: ビルド成功
   - ❌ **Failed**: ビルド失敗（ログを確認）

### 3.2 ビルドログの確認

ビルドが失敗した場合：

1. ビルド履歴で失敗したビルドをクリック
2. **View build** をクリック
3. ビルドログを確認してエラーを特定

### 3.3 デプロイの確認

ビルドが成功すると、自動的にデプロイされます：

1. **Deployments** タブで最新のデプロイメントを確認
2. **View build** をクリック
3. **Version ID** の下に**Preview URL**が表示されます
4. このURLにアクセスしてアプリが動作することを確認

## ステップ4: 今後のデプロイ

### 4.1 自動デプロイ

設定後、以下の操作で自動的にビルド・デプロイが実行されます：

1. コードを変更
2. GitHub/GitLabにプッシュ：
   ```bash
   git add .
   git commit -m "Update code"
   git push
   ```
3. Cloudflare Dashboardで自動的にビルドが開始されます
4. ビルドが成功すると、自動的にデプロイされます

### 4.2 手動デプロイ

手動でデプロイを実行する場合：

1. **Workers & Pages** → **onigiri** を選択
2. **Deployments** タブを開く
3. **Create deployment** をクリック
4. ビルド済みのバージョンを選択してデプロイ

## トラブルシューティング

### エラー: Worker name mismatch

**エラー内容**: Worker名が`wrangler.jsonc`の`name`と一致しない

**解決方法**:
1. `wrangler.jsonc`の`name`フィールドを確認
2. Cloudflare Dashboardの**Project name**を`wrangler.jsonc`の`name`と一致させる

### エラー: Build failed

**エラー内容**: ビルドが失敗する

**確認事項**:
1. ビルドログを確認
2. `package.json`の`build`コマンドが正しいか確認
3. 依存関係が正しくインストールされているか確認

### エラー: Deploy failed

**エラー内容**: デプロイが失敗する

**確認事項**:
1. `wrangler.jsonc`の設定が正しいか確認
2. リソースID（D1、R2、KV）が正しく設定されているか確認
3. Cloudflare Dashboardでリソースが作成されているか確認

### ビルドエラー: Entry module cannot be external

**エラー内容**: `Entry module "node_modules/.pnpm/nuxt@.../dist/app/entry.js" cannot be external`

**説明**: これはNuxtHub v0.10.6とNuxt 3.17.5の組み合わせで発生する既知の問題です。

**対応**:
1. Cloudflare側のビルド環境で成功する可能性があります（試してください）
2. エラーが続く場合は、[NuxtHub Core Issues](https://github.com/nuxt-hub/core/issues)で報告してください

## 参考リンク

- [Cloudflare Workers Builds ドキュメント](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [NuxtHub v0.10 マルチベンダー対応](https://hub.nuxt.com/changelog/nuxthub-multi-vendor)
- [Wrangler設定ドキュメント](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 次のステップ

デプロイが成功したら：

1. **データベースのマイグレーション**を実行：
   ```bash
   curl -X POST https://onigiri.workers.dev/api/db/migrate
   ```

2. **環境変数**を設定（必要に応じて）

3. **カスタムドメイン**を設定（オプション）
