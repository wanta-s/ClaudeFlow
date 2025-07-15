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
