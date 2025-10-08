# GitHub OAuth Login and Data Synchronization Setup Guide

このプロジェクトにGitHubアカウントでのログインと、デバイス間でのデータ同期機能を追加しました。

## 機能

- GitHubアカウントでログイン
- ログイン後、以下のデータが自動的に同期されます：
  - 保存履歴（History）
  - アプリの状態（App State: コード、入力キュー、モード）
  - Cookie情報
- ログアウト後もローカルストレージは保持されます

## セットアップ手順

### 1. GitHub OAuth Appの作成

1. https://github.com/settings/developers にアクセス
2. "New OAuth App" をクリック
3. 以下の情報を入力：
   - **Application name**: `Befunge Interpreter` (任意の名前)
   - **Homepage URL**: `http://localhost:5173` (開発環境) または本番環境のURL
   - **Authorization callback URL**: `http://localhost:3001/auth/github/callback` (開発環境) または本番環境のURL
4. "Register application" をクリック
5. Client ID と Client Secret をメモ

### 2. バックエンドのセットアップ

```bash
cd backend
npm install
cp .env.example .env
```

`.env` ファイルを編集して、GitHub OAuth の認証情報を設定：

```env
PORT=3001
SESSION_SECRET=ランダムな文字列（本番環境では必ず変更）

GITHUB_CLIENT_ID=あなたのGitHub Client ID
GITHUB_CLIENT_SECRET=あなたのGitHub Client Secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

FRONTEND_URL=http://localhost:5173
```

バックエンドサーバーを起動：

```bash
npm run dev
```

### 3. フロントエンドのセットアップ

プロジェクトのルートディレクトリで：

```bash
cp .env.local.example .env.local
```

`.env.local` は既にデフォルト設定が入っているので、通常は編集不要です。

フロントエンドを起動：

```bash
npm run dev
```

### 4. 動作確認

1. ブラウザで http://localhost:5173 にアクセス
2. 右上の「GitHubでログイン」ボタンをクリック
3. GitHubの認証画面で許可
4. ログイン後、ツールバーにGitHubユーザー名とアバターが表示されます
5. データを編集・保存すると、自動的にサーバーに同期されます
6. 別のブラウザやデバイスで同じアカウントでログインすると、同じデータが表示されます

## 本番環境へのデプロイ

### バックエンド

1. Node.js対応のホスティングサービス（Heroku、Railway、Render等）にデプロイ
2. 環境変数を設定：
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_CALLBACK_URL` (本番環境のURL)
   - `FRONTEND_URL` (本番環境のフロントエンドURL)
   - `SESSION_SECRET` (ランダムな文字列)
   - `NODE_ENV=production`

### フロントエンド

1. `.env.production` を作成：
```env
VITE_API_URL=https://your-backend-url.com
```

2. ビルド＆デプロイ：
```bash
npm run build
```

3. `dist` フォルダを静的ホスティング（Vercel、Netlify、GitHub Pages等）にデプロイ

### GitHub OAuth App設定の更新

本番環境用に、GitHub OAuth Appの設定を更新：
- Homepage URL: 本番環境のフロントエンドURL
- Authorization callback URL: 本番環境のバックエンドURL + `/auth/github/callback`

## トラブルシューティング

### ログインできない

- GitHub OAuth AppのCallback URLが正しいか確認
- バックエンドの `.env` ファイルの設定を確認
- ブラウザのコンソールでエラーメッセージを確認

### データが同期されない

- ログイン状態を確認（ツールバーにユーザー名が表示されているか）
- バックエンドサーバーが起動しているか確認
- ブラウザの開発者ツールのNetworkタブでAPI通信を確認

### CORS エラー

- バックエンドの `FRONTEND_URL` が正しく設定されているか確認
- フロントエンドの `VITE_API_URL` が正しく設定されているか確認

## アーキテクチャ

```
┌─────────────┐
│  Frontend   │
│  (Vite +    │
│   React)    │
└──────┬──────┘
       │ HTTP + Cookie Auth
       │
┌──────▼──────┐
│  Backend    │
│  (Express + │
│   Passport) │
└──────┬──────┘
       │
┌──────▼──────┐
│   SQLite    │
│  Database   │
└─────────────┘
```

データフロー：
1. ユーザーがGitHubでログイン
2. バックエンドがGitHub OAuthで認証
3. セッションCookieを発行
4. フロントエンドのデータ変更をバックエンドAPIに送信
5. バックエンドがSQLiteデータベースに保存
6. 別デバイスでログイン時、バックエンドからデータを取得
