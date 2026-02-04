# セキュリティガイド

このドキュメントでは、GitHub/GitLabにプッシュする際の機密情報の管理方法を説明します。

## 機密情報とは

以下の情報は**絶対にリポジトリに含めない**でください：

- **VAPID_PRIVATE_KEY**: プッシュ通知用の秘密鍵
- **Cloudflare API Token**: Cloudflare APIへのアクセストークン
- **データベースのパスワード**: データベース接続パスワード
- **その他の秘密鍵やAPIキー**: アプリケーションの秘密情報

## 安全な情報

以下の情報はリポジトリに含めても問題ありません：

- **D1 Database ID**: Cloudflare D1データベースのID（例: `2420ed5a-2a4c-4400-acf5-15b14b5f43b7`）
- **R2 Bucket Name**: Cloudflare R2バケット名（例: `onigiri-blob`）
- **KV Namespace ID**: Cloudflare KV名前空間のID（例: `beb16a371f1c413e8d77b6829a492b60`）
- **NUXT_PUBLIC_VAPID_PUBLIC_KEY**: VAPID公開鍵（公開鍵なので問題ありません）

## 現在の設定状況

### ✅ 安全に設定されているもの

1. **`.gitignore`**: `.env`ファイルが除外されています
2. **`wrangler.jsonc`**: リソースIDのみが含まれており、機密情報は含まれていません
3. **`.env.example`**: 実際の値は含まれておらず、テンプレートのみです

### ⚠️ 確認が必要なもの

1. **`.env`ファイル**: ローカルに存在する場合、リポジトリに含まれていないか確認してください
2. **環境変数**: Cloudflare Workers Buildsで環境変数を設定する必要があります

## Cloudflare Workers Buildsでの環境変数設定

### 手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログイン
2. **Workers & Pages** → **onigiri** を選択
3. **Settings** → **Variables** → **Environment Variables** を開く
4. 以下の環境変数を追加：

   **Production環境**:
   - `VAPID_PRIVATE_KEY`: プッシュ通知用の秘密鍵（機密情報）
   - `NUXT_PUBLIC_VAPID_PUBLIC_KEY`: プッシュ通知用の公開鍵

   **Preview環境**（オプション）:
   - 必要に応じて、プレビュー環境用の環境変数も設定できます

5. **Save** をクリック

### 環境変数の取得方法

#### VAPID Keysの生成

```bash
npm install -g web-push
web-push generate-vapid-keys
```

実行すると、以下のような出力が表示されます：

```
=======================================

Public Key:
BGx...（長い文字列）

Private Key:
xYz...（長い文字列）

=======================================
```

- **Public Key** → `NUXT_PUBLIC_VAPID_PUBLIC_KEY`に設定
- **Private Key** → `VAPID_PRIVATE_KEY`に設定（機密情報）

## プッシュ前の確認チェックリスト

GitHub/GitLabにプッシュする前に、以下を確認してください：

- [ ] `.env`ファイルがリポジトリに含まれていない
- [ ] `wrangler.jsonc`にAPIトークンや秘密鍵が含まれていない
- [ ] `.env.example`に実際の値が含まれていない
- [ ] コード内にハードコードされた秘密鍵がない

### 確認コマンド

```bash
# .envファイルがリポジトリに含まれていないか確認
git ls-files | grep -E '\.env$'

# 機密情報が含まれていないか確認（VAPID_PRIVATE_KEYなど）
git grep -i "VAPID_PRIVATE_KEY\|API_TOKEN\|SECRET\|PASSWORD" -- ':!*.md' ':!.gitignore'

# wrangler.jsoncに機密情報が含まれていないか確認
cat wrangler.jsonc | grep -i "token\|secret\|key\|password"
```

## もし機密情報を誤ってプッシュしてしまった場合

1. **すぐに秘密鍵を無効化**:
   - Cloudflare API Tokenの場合: Cloudflare Dashboardでトークンを削除
   - VAPID Keysの場合: 新しいキーペアを生成して置き換え

2. **Git履歴から削除**:
   ```bash
   # 注意: これはGit履歴を書き換えます。チームで作業している場合は相談してください
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **リモートリポジトリを更新**:
   ```bash
   git push origin --force --all
   ```

4. **新しい秘密鍵を設定**: Cloudflare Dashboardで新しい環境変数を設定

## ベストプラクティス

1. **環境変数は常にCloudflare Dashboardで管理**: リポジトリには含めない
2. **`.env.example`を使用**: 必要な環境変数のリストを共有（実際の値は含めない）
3. **定期的な確認**: 定期的にリポジトリに機密情報が含まれていないか確認
4. **チームメンバーへの共有**: 環境変数の設定方法をチームメンバーと共有

## 参考リンク

- [Cloudflare Workers環境変数](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitLab CI/CD Variables](https://docs.gitlab.com/ee/ci/variables/)
