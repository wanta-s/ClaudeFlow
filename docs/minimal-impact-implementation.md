# 最小影響実装のためのコンテキストエンジニアリング

## 概要
既存コードへの影響を最小限に抑えながら、新機能を実装するための設計パターンとAI指示方法。

## 1. 最小影響の原則

### 基本原則
```yaml
影響最小化の鉄則:
  1. 既存コードの変更を避ける
  2. 新規ファイルで機能を完結させる
  3. インターフェースで疎結合を保つ
  4. 依存性注入を活用する
  5. 段階的な統合を行う
```

## 2. 実装パターン

### 2.1 アダプターパターンによる分離
```yaml
実装指示:
  目的: 既存UserServiceを変更せずに新機能追加
  
  新規ファイル:
    adapters/UserServiceAdapter.ts:
      - 既存UserServiceをラップ
      - 新機能を追加
      - 既存APIは透過的に通す
  
  コード最小化:
    class UserServiceAdapter {
      constructor(private original: UserService) {}
      
      // 既存メソッドは委譲
      async getUser(id) { return this.original.getUser(id) }
      
      // 新機能のみ追加
      async getUserWithMetrics(id) {
        const user = await this.getUser(id)
        return { ...user, metrics: await this.fetchMetrics(id) }
      }
    }
```

### 2.2 プラグインアーキテクチャ
```yaml
実装指示:
  目的: 本体コードを変更せずに機能拡張
  
  構造:
    plugins/
      authentication/
        index.ts: エントリーポイント
        types.ts: インターフェース定義
      
  統合ポイント（1箇所のみ変更）:
    app.ts:
      + import { authPlugin } from './plugins/authentication'
      + app.use(authPlugin)
```

### 2.3 イベント駆動による疎結合
```yaml
実装指示:
  目的: 直接的な依存関係を作らない
  
  新規ファイル:
    events/UserEvents.ts:
      - イベント定義のみ
    
    handlers/UserMetricsHandler.ts:
      - イベントリスナー実装
      - 既存コードから独立
  
  最小統合:
    既存のUserService.create()に1行追加:
      + eventBus.emit('user.created', { userId })
```

## 3. 依存性注入による影響最小化

### 3.1 コンストラクタ注入
```yaml
実装パターン:
  変更前の既存コード:
    class OrderService {
      processOrder(order) {
        // 処理
      }
    }
  
  最小影響の拡張:
    class OrderService {
      constructor(private extensions?: OrderExtensions) {}
      
      processOrder(order) {
        // 既存処理
        this.extensions?.afterProcess?.(order) // 1行追加のみ
      }
    }
```

### 3.2 ファクトリーパターン
```yaml
実装指示:
  新規ファイル作成:
    factories/ServiceFactory.ts:
      - 既存サービスの生成を管理
      - 条件に応じて拡張版を返す
  
  使用側の変更（1箇所のみ）:
    - const service = new UserService()
    + const service = ServiceFactory.createUserService()
```

## 4. フィーチャーフラグによる段階的導入

### 4.1 実装テンプレート
```yaml
最小影響の機能追加:
  config/features.ts:
    export const features = {
      newUserMetrics: process.env.ENABLE_USER_METRICS === 'true'
    }
  
  既存コードへの最小追加:
    if (features.newUserMetrics) {
      return this.enhancedMethod()
    }
    return this.originalMethod()
```

### 4.2 A/Bテスト対応
```yaml
条件分岐の最小化:
  utils/featureFlag.ts:
    export const withFeature = (flag, newImpl, oldImpl) => {
      return features[flag] ? newImpl : oldImpl
    }
  
  使用例（1行で切り替え）:
    const result = withFeature('newAlgorithm',
      () => this.newCalculation(),
      () => this.oldCalculation()
    )
```

## 5. インクリメンタル実装戦略

### 5.1 段階的移行計画
```yaml
フェーズ1: 並行実装
  - 新機能を別ファイルで実装
  - 既存機能には触れない
  - インターフェースで接続準備

フェーズ2: 部分統合
  - 最小限の統合ポイントを追加
  - フィーチャーフラグで制御
  - ロールバック可能な状態を維持

フェーズ3: 段階的切り替え
  - 一部ユーザーで新機能を有効化
  - メトリクス収集
  - 問題があれば即座に戻す

フェーズ4: 完全移行
  - 全ユーザーに展開
  - 古いコードの削除は後日
```

### 5.2 実装指示の具体例
```yaml
タスク: ユーザー認証に2要素認証を追加

最小影響実装:
  1. 新規ファイルのみで実装:
     auth/twoFactor/
       TwoFactorService.ts: 2FA処理
       TwoFactorMiddleware.ts: 認証チェック
     
  2. 既存認証への統合（1箇所のみ変更）:
     AuthController.login():
       const user = await this.authService.authenticate()
     + if (user.twoFactorEnabled) {
     +   return this.twoFactorService.initiate(user)
     + }
       return this.generateToken(user)
  
  3. データベース拡張（既存テーブルは変更しない）:
     新規テーブル: user_two_factor_settings
     リレーション: user_id で関連付け
```

## 6. コード分離のベストプラクティス

### 6.1 ディレクトリ構造
```
src/
  core/              # 既存コード（変更しない）
    services/
    controllers/
  
  extensions/        # 新機能（分離）
    userMetrics/
      service.ts
      types.ts
    
  adapters/          # 統合レイヤー
    UserServiceAdapter.ts
```

### 6.2 インターフェース境界
```typescript
// 既存コードとの境界を明確に定義
interface IUserExtension {
  enhance(user: User): Promise<EnhancedUser>
}

// 実装は完全に分離
class UserMetricsExtension implements IUserExtension {
  async enhance(user: User) {
    // 新機能の実装
  }
}
```

## 7. AIへの実装指示テンプレート

### 7.1 最小影響実装の指示
```markdown
## タスク: [機能名]を既存システムに追加

### 制約条件
- 既存ファイルの変更は最小限に
- 新機能は新規ファイルで完結
- 統合ポイントは1-2箇所まで

### 実装方針
1. 新規ディレクトリ: features/[機能名]/
2. インターフェース定義: I[機能名].ts
3. 実装: [機能名]Service.ts
4. 統合: 既存の[統合ポイント]に条件分岐を1つ追加

### 変更箇所
```diff
// 既存ファイルの変更例
+ import { newFeature } from './features/newFeature'

  async processRequest(req) {
    const result = await this.process(req)
+   if (config.enableNewFeature) {
+     return newFeature.enhance(result)
+   }
    return result
  }
```
```

### 7.2 リファクタリング不要の実装
```markdown
## 実装ルール
1. 既存コードのリファクタリングは行わない
2. 新機能は既存機能の「追加」として実装
3. 既存の動作は100%維持する
4. テストは新機能のみに焦点を当てる
```

## 8. 影響範囲の可視化

### 8.1 変更マトリックス
```markdown
| 機能 | 新規ファイル | 既存ファイル変更 | 影響範囲 |
|------|------------|----------------|---------|
| 2FA追加 | 5ファイル | AuthController(+3行) | 認証のみ |
| メトリクス | 3ファイル | UserService(+1行) | 統計のみ |
| キャッシュ | 4ファイル | 0 | なし |
```

### 8.2 依存グラフ
```
既存システム
    ↓
[最小統合ポイント] ← [新機能モジュール]
    ↓                    ↑
既存の処理フロー      独立した実装
```

## 9. ロールバック戦略

### 9.1 即座に戻せる実装
```yaml
実装パターン:
  1. フィーチャーフラグ:
     if (!features.experimental) return oldBehavior()
     
  2. 環境変数:
     const handler = process.env.USE_NEW_HANDLER || 'old'
     
  3. 設定ファイル:
     config.json: { "useNewImplementation": false }
```

### 9.2 段階的ロールバック
```yaml
レベル1: 機能の無効化（設定変更のみ）
レベル2: コードの条件分岐を削除
レベル3: 新規ファイルの削除（既存には影響なし）
```

## 10. メトリクスと監視

### 10.1 最小限の計測追加
```typescript
// 1行の追加で計測開始
async processWithMetrics() {
  const start = Date.now()
  try {
    return await this.process()
  } finally {
    metrics.record('process.duration', Date.now() - start)
  }
}
```

## まとめ

最小影響実装により：
1. **リスク最小化**: 既存機能への影響を限定
2. **開発速度向上**: 独立した開発が可能
3. **ロールバック容易**: いつでも元に戻せる
4. **段階的改善**: 小さく始めて大きく育てる

この方法により、AIは既存システムを壊すことなく、安全に新機能を追加できます。