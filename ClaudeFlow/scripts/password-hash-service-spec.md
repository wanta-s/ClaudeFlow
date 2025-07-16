# パスワードハッシュサービス詳細仕様書

## 概要
bcryptを使用したパスワードのハッシュ化と検証機能を提供するスタンドアロンサービス。認証機能から独立して動作し、後から認証システムに統合可能な設計。

## インターフェース定義

```typescript
interface IPasswordHashService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  validateStrength(password: string): PasswordStrengthResult;
  getConfig(): PasswordHashConfig;
}

interface PasswordHashConfig {
  saltRounds: number;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}
```

## 主要メソッド

### hash(password: string): Promise<string>
**説明**: パスワードをbcryptでハッシュ化
**入力**: 
- password: プレーンテキストパスワード（8-128文字）
**出力**: ハッシュ化されたパスワード（bcrypt形式、60文字）
**例外**:
- InvalidPasswordError: パスワードが検証に失敗
- HashingError: ハッシュ化処理中のエラー

### verify(password: string, hash: string): Promise<boolean>
**説明**: パスワードとハッシュの照合
**入力**:
- password: 検証するプレーンテキストパスワード
- hash: bcryptハッシュ値
**出力**: 一致する場合true、しない場合false
**例外**:
- InvalidHashError: ハッシュ形式が不正
- VerificationError: 検証処理中のエラー

### validateStrength(password: string): PasswordStrengthResult
**説明**: パスワード強度の検証（同期処理）
**入力**: 検証するパスワード
**出力**: 
```typescript
{
  isValid: true,
  score: 85,
  errors: [],
  suggestions: ["特殊文字を追加するとより強固になります"]
}
```

### getConfig(): PasswordHashConfig
**説明**: 現在の設定を取得
**出力**: 設定オブジェクト

## エラーケース

### 1. InvalidPasswordError
- 空文字列
- 長さ制限違反（8文字未満、128文字超）
- 強度要件を満たさない

### 2. HashingError
- bcryptライブラリエラー
- メモリ不足
- 無効なsaltRounds

### 3. InvalidHashError
- 空のハッシュ値
- bcrypt形式でない文字列
- 破損したハッシュ

### 4. VerificationError
- bcrypt比較エラー
- 内部処理エラー

## 依存関係

### 必須依存
- bcrypt: ^5.1.0

### 開発依存
- @types/bcrypt: ^5.0.0

### ランタイム依存
なし（Node.js標準モジュールのみ）

## 実装パターン

### 1. 設定駆動型サービス
```typescript
class PasswordHashService {
  private config: PasswordHashConfig;
  
  constructor(config?: Partial<PasswordHashConfig>) {
    this.config = { ...defaultConfig, ...config };
  }
}
```

### 2. エラーファクトリー
```typescript
const createError = (type: string, message: string, details?: any) => {
  const error = new Error(message);
  error.name = type;
  if (details) error['details'] = details;
  return error;
};
```

### 3. 検証チェーン
```typescript
const validators = [
  checkLength,
  checkUppercase,
  checkLowercase,
  checkNumbers,
  checkSpecialChars
];
```

## 使用例

```typescript
// 基本的な使用
const service = new PasswordHashService();
const hash = await service.hash("SecurePass123!");
const isValid = await service.verify("SecurePass123!", hash);

// カスタム設定
const customService = new PasswordHashService({
  saltRounds: 12,
  minLength: 10,
  requireSpecialChars: true
});

// 強度検証
const strength = service.validateStrength("password123");
if (!strength.isValid) {
  console.log("エラー:", strength.errors);
  console.log("提案:", strength.suggestions);
}
```

## セキュリティ考慮事項

1. **タイミング攻撃対策**: bcryptの固定時間比較を使用
2. **メモリ安全性**: パスワードは処理後即座にクリア
3. **設定の保護**: saltRoundsは10以上を推奨
4. **エラー情報**: 詳細なエラーは開発環境のみで表示

## テスト要件

1. **単体テスト**
   - 正常系: ハッシュ化と検証
   - 異常系: 各種エラーケース
   - 境界値: 最小/最大長

2. **パフォーマンステスト**
   - 1000件の連続ハッシュ化
   - saltRounds別の処理時間

3. **セキュリティテスト**
   - 既知の弱いパスワードの検出
   - タイミング攻撃耐性