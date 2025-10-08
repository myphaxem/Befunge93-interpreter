# Befunge-93 Web Editor + Interpreter

Befunge-93プログラミング言語のWebベースのエディタ＋インタープリタです。

🌐 **アクセス:** https://befunge93-interpreter.web.app/

## 機能

- **リアルタイムエディタ**: 構文ハイライト付きのコードエディタ
- **インタープリタ**: Befunge-93コードの実行、ステップ実行
- **デバッグ**: スタック表示、PC位置表示
- **I/O**: 標準入力・標準出力のサポート
- **履歴管理**: コードの保存・読み込み機能
- **共有機能**: URLでコードを共有
- **GitHubログイン**: Firebase Authenticationを使用したログイン機能

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

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
- Firebase Authentication + Firestore
- Web Workers (インタープリタ実行)

## ライセンス

MIT
