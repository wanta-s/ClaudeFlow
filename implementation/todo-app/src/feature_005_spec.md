認証ミドルウェアの詳細仕様を作成しました。

主な内容：
- **インターフェース定義**: AuthenticatedRequest、JWTPayload、AuthError、AuthResult
- **主要メソッド**: authMiddleware、verifyToken、extractToken、setAuthenticatedUser
- **エラーケース**: 6種類の認証エラー（MISSING_TOKEN、INVALID_FORMAT、TOKEN_EXPIRED等）
- **依存関係**: Express、jsonwebtoken、内部モジュール
- **実装詳細**: トークン抽出、検証フロー、セキュリティ考慮事項、パフォーマンス最適化

ファイル: `/mnt/c/makeProc/ClaudeFlow/ClaudeFlow/scripts/auth-middleware-spec.md`
