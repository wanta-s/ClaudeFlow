単体テストとの作成が完了しました。以下のテストファイルを作成しました：

## 単体テスト（正常系・異常系・境界値）:

1. **エラーハンドリングクラス** (`__tests__/utils/errors.test.ts`)
   - カスタムエラークラスの作成と継承
   - ステータスコードの設定
   - スタックトレースの取得

2. **設定モジュール** (`__tests__/utils/config.test.ts`)
   - 環境変数の読み込み
   - デフォルト値の適用
   - バリデーション（無効な値の検出）

3. **ロガーモジュール** (`__tests__/utils/logger.test.ts`)
   - ログレベルの処理
   - 開発/本番環境での動作
   - エラーオブジェクトの処理

4. **DIコンテナ** (`__tests__/utils/container.test.ts`)
   - サービスの登録と解決
   - ファクトリ関数のサポート
   - 循環依存の検出

5. **パスワードサービス** (`__tests__/services/passwordService.test.ts`)
   - パスワードのハッシュ化（境界値：72文字）
   - パスワードの検証
   - 特殊文字・Unicode文字の処理

6. **JWTサービス** (`__tests__/services/jwtService.test.ts`)
   - トークンの生成
   - トークンの検証（期限切れ、無効）
   - リフレッシュトークンの処理

7. **Userモデル** (`__tests__/models/user.test.ts`)
   - バリデーション（必須フィールド、形式）
   - フック（パスワードの自動ハッシュ化）
   - インスタンスメソッド

8. **Userリポジトリ** (`__tests__/repositories/userRepository.test.ts`)
   - CRUD操作
   - 重複チェック
   - エラーハンドリング

9. **認証コントローラ** (`__tests__/controllers/authController.test.ts`)
   - ユーザー登録
   - ログイン（無効な認証情報）
   - トークンリフレッシュ

10. **バリデーションミドルウェア** (`__tests__/middleware/validation.test.ts`)
    - 入力検証
    - エラーメッセージの整形
    - 複数エラーの処理

11. **エラーハンドラーミドルウェア** (`__tests__/middleware/errorHandler.test.ts`)
    - 運用エラーと非運用エラーの区別
    - 開発/本番環境での応答
    - ロギング

## 統合テスト:

12. **認証API統合テスト** (`__tests__/integration/auth.test.ts`)
    - エンドツーエンドのAPI動作
    - レート制限
    - セキュリティヘッダー
    - Cookie処理

各テストは以下をカバーしています：
- ✅ 正常系：期待される動作
- ✅ 異常系：エラー処理、無効な入力
- ✅ 境界値：最大/最小値、空文字列、null/undefined
