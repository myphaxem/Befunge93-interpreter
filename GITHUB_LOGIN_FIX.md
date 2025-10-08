# GitHubログイン問題の解決方法

## 問題の概要

GitHub PagesにデプロイされたアプリケーションでGitHubログインを試みると、以下のエラーが表示される問題が発生していました：

```
Be careful!
The redirect_uri is not associated with this application.
```

## 原因

このエラーは、Firebase Authenticationの設定で、GitHub Pagesのドメイン（`<ユーザー名>.github.io`）が承認済みドメインとして登録されていないことが原因です。

## 解決方法

以下の手順で問題を解決できます：

### 1. Firebaseの承認済みドメインにGitHub Pagesドメインを追加

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを選択
3. 左メニューから「Authentication」を選択
4. 上部の「Settings」タブをクリック
5. 「Authorized domains」セクションを探す
6. 「Add domain」ボタンをクリック
7. 以下のドメインを追加：
   ```
   omoch1-2357.github.io
   ```
8. 「Add」をクリックして保存

### 2. GitHubリポジトリにFirebase環境変数を設定

GitHub Pagesにデプロイする際、Firebase環境変数が必要です：

1. GitHubリポジトリのページを開く
2. 「Settings」タブをクリック
3. 左メニューから「Secrets and variables」→「Actions」を選択
4. 「New repository secret」をクリックして、以下の環境変数を1つずつ追加：

   | シークレット名 | 説明 |
   |--------------|------|
   | `VITE_FIREBASE_API_KEY` | FirebaseのAPIキー |
   | `VITE_FIREBASE_AUTH_DOMAIN` | 認証ドメイン（例: `befunge93-interpreter.firebaseapp.com`） |
   | `VITE_FIREBASE_PROJECT_ID` | プロジェクトID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | ストレージバケット |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | メッセージング送信者ID |
   | `VITE_FIREBASE_APP_ID` | アプリID |

これらの値は、Firebaseコンソールの「プロジェクトの設定」→「全般」→「マイアプリ」セクションで確認できます。

### 3. GitHub Actionsワークフローの更新

このPRでは、`.github/workflows/pages.yml`を更新して、ビルド時に環境変数を読み込むように設定しました。

変更内容：
```yaml
- name: Build
  run: npx vite build --base="/${{ github.event.repository.name }}/"
  env:
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
    VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
    VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
    VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
    VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
```

### 4. 再デプロイ

上記の設定が完了したら、mainブランチにマージすると、GitHub Actionsが自動的に再デプロイします。

または、「Actions」タブから「Deploy to GitHub Pages」ワークフローを手動で実行できます。

## 確認方法

1. デプロイが完了したら、GitHub Pagesのサイトにアクセス
   ```
   https://omoch1-2357.github.io/Befunge93-interpreter/
   ```

2. 「GitHubでログイン」ボタンが表示されることを確認

3. ボタンをクリックしてログインを試みる

4. Firebaseの認証ポップアップが表示され、エラーなくログインできることを確認

## 追加情報

詳細なFirebase認証のセットアップ手順は、[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)を参照してください。

特に以下のセクションが参考になります：
- 「承認済みドメインの設定（重要）」
- 「GitHub Pagesへのデプロイ（オプション）」
- 「トラブルシューティング」

## 注意事項

- 承認済みドメインの追加後、変更が反映されるまで数分かかる場合があります
- GitHub Secretsの設定後、ワークフローを再実行する必要があります
- 開発環境（localhost）でのログインには、`.env.local`ファイルが必要です
