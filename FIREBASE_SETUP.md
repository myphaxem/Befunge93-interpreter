# Firebase Authentication Setup

このプロジェクトはFirebase Authenticationを使用してGitHubアカウントでのログインをサポートしています。

## セットアップ手順

### 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を入力（例: befunge-interpreter）
4. Google Analyticsは任意で設定

### 2. Authentication の設定

1. Firebaseコンソールの左メニューから「Authentication」を選択
2. 「Get started」をクリック
3. 「Sign-in method」タブを選択
4. 「GitHub」を有効にする

#### GitHubOAuthアプリの作成

1. [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)にアクセス
2. 「New OAuth App」をクリック
3. 以下の情報を入力：
   - **Application name**: Befunge93 Interpreter（任意の名前）
   - **Homepage URL**: `https://<ユーザー名>.github.io/Befunge93-interpreter/`
   - **Authorization callback URL**: Firebaseコンソールに表示されているコールバックURL（例: `https://befunge93-interpreter.firebaseapp.com/__/auth/handler`）
4. 「Register application」をクリック
5. 表示される「Client ID」と「Client Secret」をFirebaseコンソールに入力

#### 承認済みドメインの設定（重要）

GitHub Pagesにデプロイする場合、以下の手順で承認済みドメインを追加する必要があります：

1. Firebaseコンソールの「Authentication」→「Settings」タブを開く
2. 「Authorized domains」セクションを確認
3. 「Add domain」をクリック
4. GitHub Pagesのドメインを追加：
   ```
   <あなたのGitHubユーザー名>.github.io
   ```
   例: `omoch1-2357.github.io`

**注意**: この設定を行わないと、ログイン時に「redirect_uri is not associated with this application」というエラーが表示されます。

### 3. Firestore の設定

1. Firebaseコンソールの左メニューから「Firestore Database」を選択
2. 「Create database」をクリック
3. 本番モードまたはテストモードを選択
4. ロケーションを選択（asia-northeast1推奨）
5. セキュリティルールを設定：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. 環境変数の設定

1. Firebaseコンソールのプロジェクト設定から「全般」タブを開く
2. 「アプリ」セクションで「</> Web」を選択
3. アプリを登録して設定情報を取得
4. `.env.example`を`.env.local`としてコピー
5. 取得した設定情報を`.env.local`に入力：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

### 6. GitHub Pagesへのデプロイ（オプション）

GitHub Pagesにデプロイする場合、環境変数をGitHubリポジトリのSecretsに設定する必要があります：

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」を開く
2. 「New repository secret」をクリックして以下の環境変数を追加：
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. `.github/workflows/pages.yml`を更新して、ビルド時に環境変数を設定：

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

4. Firebaseの承認済みドメインに`<ユーザー名>.github.io`を追加（上記2-4を参照）

## 機能

- **GitHubログイン**: GitHubアカウントでログイン
- **データ同期**: ログイン状態でアプリケーションの状態と履歴をFirestoreに自動同期
- **オフライン対応**: ログインしていない場合はローカルストレージとCookieを使用
- **データ移行**: 初回ログイン時にローカルデータを自動的にFirestoreに移行

## 注意事項

- Firebase無料プラン（Spark plan）を使用
- `.env.local`ファイルは`.gitignore`に含まれているため、コミットされません
- 本番環境にデプロイする場合は、環境変数を適切に設定してください

## トラブルシューティング

### "redirect_uri is not associated with this application" エラー

このエラーが表示される場合、以下の点を確認してください：

1. **承認済みドメインの確認**
   - Firebaseコンソールの「Authentication」→「Settings」→「Authorized domains」を開く
   - デプロイ先のドメイン（例: `<ユーザー名>.github.io`）が登録されているか確認
   - 登録されていない場合は「Add domain」で追加

2. **GitHub OAuth設定の確認**
   - GitHubのOAuthアプリ設定で、Authorization callback URLが正しく設定されているか確認
   - FirebaseのAuthenticationページに表示されているコールバックURLと一致している必要があります

3. **環境変数の確認**
   - `.env.local`ファイル（または本番環境の環境変数）が正しく設定されているか確認
   - 特に`VITE_FIREBASE_AUTH_DOMAIN`が正しいか確認

### ログイン機能が表示されない

Firebase設定が正しく行われていない場合、ログイン機能は自動的に非表示になります。これは正常な動作です。

- `.env.local`ファイルが存在し、正しい値が設定されているか確認
- `npm run dev`を再起動して環境変数を読み込み直す
