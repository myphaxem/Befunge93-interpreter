# 問題解決の図解

## エラーが発生する理由

```
┌─────────────────────────────────────────────────────────────────┐
│                    ユーザーがログインを試みる                      │
│                                                                 │
│  GitHub Pages: https://omoch1-2357.github.io/Befunge93-...     │
│                                                                 │
│  ┌────────────┐                                                │
│  │ ログインボタン │ ← クリック                                     │
│  └────────────┘                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Authentication                            │
│                                                                 │
│  承認済みドメインリスト:                                            │
│  ✓ localhost                                                   │
│  ✓ befunge93-interpreter.firebaseapp.com                       │
│  ✗ omoch1-2357.github.io  ← ❌ 未登録！                          │
│                                                                 │
│  エラー: "redirect_uri is not associated with this application" │
└─────────────────────────────────────────────────────────────────┘
```

## 解決方法

### ステップ1: Firebase コンソールでドメインを承認

```
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Console                                   │
│                                                                 │
│  Authentication > Settings > Authorized domains                 │
│                                                                 │
│  承認済みドメイン:                                                 │
│  ✓ localhost                                                   │
│  ✓ befunge93-interpreter.firebaseapp.com                       │
│  ✓ omoch1-2357.github.io  ← ✅ 追加！                            │
│                                                                 │
│  [Add domain] ボタン                                            │
└─────────────────────────────────────────────────────────────────┘
```

### ステップ2: GitHub Secrets を設定

```
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Repository Settings                         │
│                                                                 │
│  Settings > Secrets and variables > Actions                     │
│                                                                 │
│  Repository secrets:                                            │
│  • VITE_FIREBASE_API_KEY                                       │
│  • VITE_FIREBASE_AUTH_DOMAIN                                   │
│  • VITE_FIREBASE_PROJECT_ID                                    │
│  • VITE_FIREBASE_STORAGE_BUCKET                                │
│  • VITE_FIREBASE_MESSAGING_SENDER_ID                           │
│  • VITE_FIREBASE_APP_ID                                        │
│                                                                 │
│  [New repository secret] ボタン                                 │
└─────────────────────────────────────────────────────────────────┘
```

### ステップ3: ワークフローの自動実行

```
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                            │
│                                                                 │
│  .github/workflows/pages.yml                                    │
│                                                                 │
│  - name: Build                                                  │
│    run: npm run build                                           │
│    env:                                                         │
│      VITE_FIREBASE_API_KEY: ${{ secrets.VITE_... }} ← ✅       │
│      VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.... }} ← ✅        │
│      ...                                                        │
│                                                                 │
│  ビルド時に環境変数が注入される                                     │
└─────────────────────────────────────────────────────────────────┘
```

### ステップ4: ログイン成功！

```
┌─────────────────────────────────────────────────────────────────┐
│                    ユーザーがログインを試みる                      │
│                                                                 │
│  GitHub Pages: https://omoch1-2357.github.io/Befunge93-...     │
│                                                                 │
│  ┌────────────┐                                                │
│  │ ログインボタン │ ← クリック                                     │
│  └────────────┘                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Authentication                            │
│                                                                 │
│  承認済みドメインリスト:                                            │
│  ✓ localhost                                                   │
│  ✓ befunge93-interpreter.firebaseapp.com                       │
│  ✓ omoch1-2357.github.io  ← ✅ 認証成功！                        │
│                                                                 │
│  GitHub OAuth ポップアップが表示される                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub OAuth                                 │
│                                                                 │
│  Befunge93 Interpreter がアクセスを要求しています                  │
│                                                                 │
│  [Authorize] ボタン ← クリック                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ログイン完了！ ✅                                 │
│                                                                 │
│  ユーザー情報が表示される                                           │
│  データがFirestoreに同期される                                     │
└─────────────────────────────────────────────────────────────────┘
```

## チェックリスト

設定を完了するには、以下をすべて確認してください：

- [ ] Firebaseコンソールで`omoch1-2357.github.io`を承認済みドメインに追加
- [ ] GitHubリポジトリのSecretsに6つの環境変数を追加
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
- [ ] このPRをマージ（ワークフローが自動的に更新される）
- [ ] GitHub Actionsが正常に完了するのを待つ
- [ ] デプロイされたサイトでログインをテスト

## トラブルシューティング

### ログインボタンが表示されない

原因: Firebase環境変数が設定されていない、またはビルドに含まれていない

解決方法:
1. GitHub Secretsが正しく設定されているか確認
2. ワークフローファイルが更新されているか確認
3. Actions タブで最新のワークフロー実行ログを確認

### 環境変数の値が分からない

Firebase環境変数は以下の場所で確認できます：

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを選択
3. 歯車アイコン ⚙️ をクリック → 「プロジェクトの設定」
4. 「全般」タブを選択
5. 「マイアプリ」セクションまでスクロール
6. Webアプリを選択（または新規作成）
7. 「Firebase SDK snippet」→「構成」を選択
8. 表示されるコードから各値をコピー

```javascript
const firebaseConfig = {
  apiKey: "...",           // → VITE_FIREBASE_API_KEY
  authDomain: "...",       // → VITE_FIREBASE_AUTH_DOMAIN
  projectId: "...",        // → VITE_FIREBASE_PROJECT_ID
  storageBucket: "...",    // → VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...", // → VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "..."             // → VITE_FIREBASE_APP_ID
};
```

### それでもログインできない

1. ブラウザのコンソールを開く（F12キー）
2. エラーメッセージを確認
3. [GITHUB_LOGIN_FIX.md](./GITHUB_LOGIN_FIX.md)のトラブルシューティングセクションを参照
4. それでも解決しない場合は、Issueを作成して詳細を報告してください
