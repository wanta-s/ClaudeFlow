ユーザー登録機能の単体テストを生成しました。以下のテストファイルを作成しました：

1. **APIルートテスト** (`/tests/api/auth/register/route.test.ts`)
   - 正常系: 新規登録、複数ユーザー登録
   - 異常系: 必須項目チェック、重複登録、パスワード長、JSONエラー
   - 境界値: 8文字パスワード、50文字名前、255文字メール

2. **コンポーネントテスト** (`/tests/components/auth/RegisterForm.test.tsx`)
   - 正常系: レンダリング、登録成功、ローディング状態
   - 異常系: メール重複、一般エラー、ネットワークエラー
   - フォーム: 入力値反映、HTML5バリデーション属性

3. **E2Eテスト** (`/tests/integration/user-registration.e2e.test.ts`)
   - 正常系: 登録からダッシュボード遷移、再ログイン
   - 異常系: 重複登録、必須項目、パスワード長
   - UI: リンク動作、ボタン状態、フォーム保持
   - アクセシビリティ: ラベル、キーボード操作
   - レスポンシブ: モバイル・タブレット表示

全てのテストケースで正常系、異常系、境界値を網羅しています。
