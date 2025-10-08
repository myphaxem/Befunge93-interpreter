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
   - GitHubの設定ページで新しいOAuthアプリを作成
   - Authorization callback URLをFirebaseから提供されたURLに設定
   - Client IDとClient Secretを取得してFirebaseに入力

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

## 機能

- **GitHubログイン**: GitHubアカウントでログイン
- **データ同期**: ログイン状態でアプリケーションの状態と履歴をFirestoreに自動同期
- **オフライン対応**: ログインしていない場合はローカルストレージとCookieを使用
- **データ移行**: 初回ログイン時にローカルデータを自動的にFirestoreに移行

## 注意事項

- Firebase無料プラン（Spark plan）を使用
- `.env.local`ファイルは`.gitignore`に含まれているため、コミットされません
- 本番環境にデプロイする場合は、環境変数を適切に設定してください
