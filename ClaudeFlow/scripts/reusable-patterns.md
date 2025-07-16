# 再利用可能なパターン

実装から抽出した再利用可能なパターンです。

## Result型パターン
エラーハンドリングを型安全に行うパターン
```typescript
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

const ok = <T>(value: T): Result<T, never> => ({ success: true, value });
const err = <E>(error: E): Result<never, E> => ({ success: false, error });

// 使用例
async function tryOperation(): Promise<Result<string>> {
  try {
    const result = await riskyOperation();
    return ok(result);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
```

## イミュータブル設定パターン
設定を不変オブジェクトとして管理するパターン
```typescript
interface Config {
  readonly optionA: string;
  readonly optionB: number;
  readonly optionC?: boolean;
}

const DEFAULT_CONFIG: Required<Config> = {
  optionA: 'default',
  optionB: 10,
  optionC: false
} as const;

class Service {
  private readonly config: Required<Config>;
  
  constructor(config: Config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  getConfig(): Required<Config> {
    return { ...this.config }; // コピーを返す
  }
}
```

## セキュリティレベルプリセットパターン
事前定義された設定セットを提供するパターン
```typescript
type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const SECURITY_PRESETS: Record<SecurityLevel, Config> = {
  LOW: { optionA: 'weak', optionB: 5 },
  MEDIUM: { optionA: 'moderate', optionB: 10 },
  HIGH: { optionA: 'strong', optionB: 20 }
} as const;

class Service {
  static withLevel(level: SecurityLevel): Service {
    return new Service(SECURITY_PRESETS[level]);
  }
}
```

## コンポーザブルバリデーションパターン
検証ルールを組み合わせ可能な形で実装するパターン
```typescript
type ValidationError = string | null;
type ValidationRule = (value: string) => ValidationError;

const createRule = (
  condition: (config: Config) => boolean,
  check: (value: string) => boolean,
  message: string
): (config: Config) => ValidationRule => 
  (config) => (value) => condition(config) && !check(value) ? message : null;

// 使用例
const minLengthRule = (min: number): ValidationRule =>
  (value) => value.length < min ? `最小${min}文字必要です` : null;

const patternRule = (pattern: RegExp, message: string): ValidationRule =>
  (value) => !pattern.test(value) ? message : null;
```

## エクスポネンシャルバックオフリトライパターン
失敗時に指数的に遅延を増やしながらリトライするパターン
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * (1 << (attempt - 1)); // 2^(attempt-1)
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}
```

## ファクトリーメソッドパターン
インスタンス生成をカプセル化するパターン
```typescript
class Service {
  private constructor(private config: Config) {}
  
  static create(options?: Partial<Config>): Service {
    return new Service({ ...DEFAULT_CONFIG, ...options });
  }
  
  static withPreset(preset: 'dev' | 'staging' | 'prod'): Service {
    const configs = {
      dev: { debug: true, logLevel: 'verbose' },
      staging: { debug: false, logLevel: 'info' },
      prod: { debug: false, logLevel: 'error' }
    };
    return new Service(configs[preset]);
  }
}
```

## バリデーション結果パターン
詳細なエラー情報を含む検証結果を返すパターン
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validate(value: string, rules: ValidationRule[]): ValidationResult {
  const errors = rules
    .map(rule => rule(value))
    .filter((error): error is string => error !== null);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## 環境ベース設定パターン
環境変数に基づいて設定を切り替えるパターン
```typescript
const getEnvironmentConfig = (): Config => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs: Record<string, Config> = {
    development: { logLevel: 'debug', cache: false },
    staging: { logLevel: 'info', cache: true },
    production: { logLevel: 'error', cache: true }
  };
  
  return configs[env] || configs.development;
};

const service = new Service(getEnvironmentConfig());
```

## エラーメッセージ定数パターン
エラーメッセージを一元管理するパターン
```typescript
const ERROR_MESSAGES = {
  EMPTY_INPUT: 'Input cannot be empty',
  INVALID_FORMAT: 'Invalid format',
  MIN_LENGTH: (n: number) => `Minimum ${n} characters required`,
  MAX_LENGTH: (n: number) => `Maximum ${n} characters allowed`,
  OPERATION_FAILED: (op: string, reason: string) => `${op} failed: ${reason}`
} as const;

// 使用例
throw new Error(ERROR_MESSAGES.MIN_LENGTH(8));
```

## オプション型パラメータパターン
操作に追加オプションを渡すパターン
```typescript
interface OperationOptions {
  retries?: number;
  timeout?: number;
  skipValidation?: boolean;
}

async function performOperation(
  input: string,
  options?: OperationOptions
): Promise<string> {
  const { 
    retries = 3, 
    timeout = 5000, 
    skipValidation = false 
  } = options || {};
  
  if (!skipValidation) {
    validateInput(input);
  }
  
  return retryWithBackoff(
    () => doOperation(input, timeout),
    retries
  );
}
```

## 正規化パターン
入力値を標準形式に変換するパターン
```typescript
const normalizeInput = (input: string): string => 
  input
    ?.replace(/[\t\n\r]/g, '') // 制御文字を削除
    .trim()                     // 前後の空白を削除
    .toLowerCase()              // 小文字に統一
    || '';

// 使用例
const normalized = normalizeInput('  Hello\nWorld  ');
// 結果: "helloworld"
```

## バッチ処理パターン
複数の操作を効率的に処理するパターン
```typescript
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<Result<R>>,
  concurrency: number = 5
): Promise<{ succeeded: R[]; failed: Array<{ item: T; error: Error }> }> {
  const chunks = [];
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency));
  }
  
  const succeeded: R[] = [];
  const failed: Array<{ item: T; error: Error }> = [];
  
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (item) => ({ item, result: await processor(item) }))
    );
    
    results.forEach(({ item, result }) => {
      if (result.success) {
        succeeded.push(result.value);
      } else {
        failed.push({ item, error: result.error });
      }
    });
  }
  
  return { succeeded, failed };
}
```