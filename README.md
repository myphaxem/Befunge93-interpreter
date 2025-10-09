# Befunge-93 Web Editor + Interpreter

Befunge-93プログラミング言語のWebベースのエディタ＋インタープリタです。

**アクセスURL**: https://befunge93-interpreter.web.app/

## 機能

- **リアルタイムエディタ**: 構文ハイライト付きのコードエディタ
- **インタープリタ**: Befunge-93コードの実行、ステップ実行
- **デバッグ**: スタック表示、PC位置表示
- **I/O**: 標準入力・標準出力のサポート
- **履歴管理**: コードの保存・読み込み機能
- **共有機能**: URLでコードを共有
- **GitHubログイン**: Firebase Authenticationを使用したログイン・データ同期機能

## セットアップ

### 基本的な使用方法

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

### Firebase Authentication

本番環境ではFirebase AuthenticationによるGitHubログインとFirestoreによるデータ同期が有効になっています。

ローカル環境でFirebase機能を使用する場合は、`.env.example`を参考に`.env.local`ファイルを作成し、Firebase設定を追加してください。

**注意**: Firebase設定がなくてもアプリケーションは正常に動作します。ログイン機能は表示されず、データはローカルストレージとCookieに保存されます。

## 使用方法

1. エディタにBefunge-93コードを記述
2. 「実行」ボタンでプログラムを実行
3. 「ステップ」ボタンで1ステップずつ実行
4. 「停止/リセット」で実行を停止

### サンプルコード

- **hello_world.bf**: "Hello World!"を出力
- **cat.bf**: 入力をそのまま出力
- **sieve.bf**: エラトステネスの篩
- **random.bf**: ランダム数生成

## 技術スタック

- React + TypeScript
- Vite
- Monaco Editor
- Firebase Authentication + Firestore (オプション)
- Web Workers (インタープリタ実行)

## ライセンス

MIT
