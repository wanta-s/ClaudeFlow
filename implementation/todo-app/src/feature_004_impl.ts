最小限のログインAPI実装を完了しました。

**作成したファイル:**
1. `implementation/loginService.ts` - ログインサービス本体
2. `implementation/loginService.test.ts` - 基本的なテスト

**実装内容:**
- ログインリクエストの検証
- ユーザー認証（既存のpasswordService利用）
- トークン生成（インターフェースのみ）
- エラーハンドリング（最小限）
