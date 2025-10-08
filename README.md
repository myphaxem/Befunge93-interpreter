# Befunge-93 Web Interpreter

Befunge-93のオンラインエディタ＆インタープリターです。TypeScript + React + Viteで実装されています。

## 主な機能

- **オンラインエディタ**: Monaco Editorを使用した高機能エディタ
- **インタープリター**: Befunge-93プログラムの実行・ステップ実行
- **保存履歴**: プログラムの保存・管理（フォルダ機能付き）
- **共有機能**: URLでコードを共有
- **GitHubログイン**: GitHubアカウントでログインしてデータを同期

## 🆕 GitHub認証とデータ同期

GitHubアカウントでログインすることで、以下のデータが複数デバイス間で自動的に同期されます：

- 保存履歴（History）
- アプリの状態（コード、入力キュー、モード）
- Cookie情報

### セットアップ

詳細なセットアップ手順は [SETUP_AUTH.md](./SETUP_AUTH.md) をご覧ください。

簡単な手順：

1. **バックエンドのセットアップ**
```bash
cd backend
npm install
cp .env.example .env
# .env を編集してGitHub OAuth認証情報を設定
npm run dev
```

2. **フロントエンドの起動**
```bash
npm install
npm run dev
```

3. ブラウザで http://localhost:5173 にアクセス
4. 右上の「GitHubでログイン」ボタンをクリック

### ログインなしでの使用

GitHubログインは任意です。ログインしなくても、従来通りローカルストレージでデータを保存して使用できます。

## 開発

### 必要な環境

- Node.js 18以上
- npm

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### バックエンド開発

```bash
cd backend
npm install
npm run dev  # ファイル変更を監視して自動再起動
```

## プロジェクト構造

```
.
├── src/
│   ├── app/           # メインアプリケーション
│   ├── runtime/       # Befungeランタイムとストレージ
│   │   └── ts/
│   │       ├── vm.ts        # Befunge VMの実装
│   │       ├── history.ts   # 履歴管理
│   │       ├── auth.ts      # 認証サービス
│   │       └── storage.ts   # ストレージ抽象化
│   ├── ui/            # UIコンポーネント
│   ├── editor/        # エディタ関連
│   └── workers/       # Web Workers
├── backend/           # バックエンドサーバー
│   ├── src/
│   │   ├── server.js  # Express サーバー
│   │   └── db.js      # SQLite データベース
│   └── data/          # データベースファイル
├── samples/           # サンプルプログラム
└── public/            # 静的ファイル
```

## 技術スタック

### フロントエンド
- **React 18** - UIフレームワーク
- **TypeScript** - 型安全な開発
- **Vite** - 高速ビルドツール
- **Monaco Editor** - コードエディタ
- **LZ-String** - データ圧縮

### バックエンド
- **Express** - Webフレームワーク
- **Passport.js** - GitHub OAuth認証
- **SQLite (better-sqlite3)** - データベース
- **express-session** - セッション管理

## Befunge-93について

Befunge-93は、1993年にChris Presseyによって作られた2次元のエソテリックプログラミング言語です。
プログラムは80x25のグリッド上に配置され、プログラムカウンタが上下左右に移動しながら命令を実行します。

詳細は [Esolang Wiki](https://esolangs.org/wiki/Befunge) をご覧ください。

## ライセンス

MIT

## 開発者

開発・バグ報告は [GitHub Issues](https://github.com/myphaxem/Befunge93-interpreter/issues) でお願いします。
