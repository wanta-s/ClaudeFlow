# 再利用可能パターンライブラリ

## 基本パターン
### 1. エラーハンドリングパターン
```typescript
const safely = <T>(fn: () => T, defaultValue: T): T => {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
};
```

### 2. バリデーションパターン
```typescript
const validate = <T>(value: T, rules: Array<(v: T) => boolean>): boolean => 
  rules.every(rule => rule(value));
```

### **パスワードハッシュ処理**: bcryptを使用したパスワードのハッシュ化と検証 のパターン
実装から15個の再利用可能なパターンを抽出し、`reusable-patterns.md`に文書化しました。主なパターンには設定駆動型サービス、セキュリティプリセット、ファクトリーメソッド、シングルトンエクスポート、検証結果オブジェクト、エラーメッセージ定数化などが含まれます。

### **ユーザー登録API**: ユーザー登録エンドポイントとバリデーション のパターン
12個の再利用可能なパターンを抽出し、`reusable-patterns.md`に文書化しました。各パターンは簡潔な説明とTypeScriptコード例を含んでおり、他のプロジェクトでも活用できます。

### **ログインAPI**: ユーザー認証とトークン発行エンドポイント のパターン
12個の再利用可能なパターンを抽出し、`reusable-patterns.md`に保存しました。

### **認証ミドルウェア**: APIリクエストのJWT検証処理 のパターン
再利用可能なパターンを抽出してファイルに保存しました。
