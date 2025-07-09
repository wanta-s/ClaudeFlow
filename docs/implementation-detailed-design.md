# 実装のための詳細設計書（AIコンテキストエンジニアリング版）

## 概要
関数・APIの流れを確実に確認し、実装に必要な情報を最小限かつ最大効果で記述する詳細設計手法。

## 1. API/関数フロー記述法

### 1.1 フロー記号体系
```yaml
記号定義:
  →: 順次処理
  ⇒: 非同期処理
  ↘: 条件分岐（成功）
  ↗: 条件分岐（失敗）
  ⟲: ループ処理
  ⤴: 例外throw
  ⤵: 例外catch
  ▶: 外部API呼び出し
  ◀: コールバック/レスポンス
  ⚡: イベント発火
  ⏱: タイムアウト/遅延
  🔒: トランザクション境界
  📍: チェックポイント
```

### 1.2 圧縮フロー記述
```yaml
# ユーザー認証フロー例
POST /auth/login:
  ①validate(email,pass) ↗400
  ②UserRepo.find(email) ↗404
  ③bcrypt.compare(pass) ↗401
  ④Token.generate(user) ⇒
  ⑤Session.create(token) 🔒
  ⑥Event.emit('login') ⚡
  ⑦Response(200,{token})
  
error-flows:
  ↗400: {error:"validation_failed"}
  ↗404: {error:"user_not_found"}
  ↗401: {error:"invalid_password"}
  ⤴500: rollback→log→{error:"internal"}
```

## 2. 実装詳細設計テンプレート

### 2.1 機能単位の詳細設計
```yaml
機能: ユーザー認証API
エンドポイント: POST /api/auth/login

# フロー定義（50トークン）
flow:
  main: req→validate→find→compare→token→session→res
  error: validate↗400 | find↗404 | compare↗401 | *↗500

# データ変換（30トークン）
transform:
  in: {email:string,password:string}
  ①: validate→LoginDTO
  ②: find→User|null
  ③: compare→boolean
  ④: generate→{token,refresh}
  out: {user,token,refresh}

# 依存関係（20トークン）
deps:
  →UserRepository.findByEmail(email)
  →CryptoService.compare(plain,hash)
  →TokenService.generatePair(user)
  →SessionService.create(user,token)
  ⚡EventBus.emit('user.login',user)

# 制約条件（15トークン）
constraints:
  rate: 5req/min/ip
  timeout: 3s
  tx: session-creation
  cache: user-data:5min
```

### 2.2 複雑な処理の詳細設計
```yaml
機能: 注文処理システム
API: POST /api/orders/create

# メインフロー（80トークン）
flow:
  ①auth: token→user ↗401
  ②validate: 
    - items[]→valid ↗400
    - stock.check() ↗409
    - price.verify() ↗422
  ③process: 🔒
    - Order.create()
    - Stock.reserve()
    - Payment.authorize() ↗402
    - Order.confirm()
  ④notify: ⚡
    - user.email
    - warehouse.system
    - analytics.track
  ⑤response: 201,order

# エラー補償（30トークン）
compensation:
  402: Stock.release()→Order.cancel()
  409: suggest-alternatives()
  timeout: Payment.void()→Stock.release()

# 状態遷移（25トークン）
states:
  DRAFT→VALIDATED→PROCESSING→
  ↓402:PAYMENT_FAILED→CANCELLED
  ↓200:PAID→CONFIRMED→SHIPPED
```

## 3. 実装フロー検証チェックリスト

### 3.1 フロー完全性チェック
```yaml
必須確認項目:
  □ 全ての入力パターンを網羅
  □ 全てのエラーパスを定義
  □ 非同期処理の完了確認
  □ トランザクション境界の明確化
  □ リソースの確実な解放
  □ タイムアウト処理の実装
  □ 並行処理の考慮
```

### 3.2 データフロー追跡
```yaml
# データ変換の追跡例
LoginRequest:
  ①raw: {email:"test@example",password:"plain"}
  ②validated: LoginDTO{email,password}
  ③user: User{id:123,email,hash}
  ④compared: true
  ⑤token: Token{access:"jwt...",refresh:"uuid"}
  ⑥session: Session{id,userId,token,expires}
  ⑦response: {user:{id,email},token,refresh}

transform-points:
  ①→②: validation+sanitize
  ②→③: db-query+deserialize  
  ④→⑤: jwt-sign+uuid-gen
  ⑤→⑥: session-create
  ⑥→⑦: serialize+filter
```

## 4. API連携フローの記述

### 4.1 マイクロサービス間連携
```yaml
# 注文→決済→配送の連携フロー
order-fulfillment-flow:
  OrderService:
    create() →
    ▶PaymentService.charge() ⇒
    ◀{transactionId} →
    ▶InventoryService.reserve() ⇒
    ◀{reservationId} →
    ▶ShippingService.schedule() ⇒
    ◀{trackingId} →
    complete()

  error-handling:
    PaymentService↗: compensate→cancel
    InventoryService↗: payment.refund→cancel  
    ShippingService↗: inventory.release→retry

  timeouts:
    Payment: 30s → cancel
    Inventory: 10s → retry×3
    Shipping: 60s → manual-intervention
```

### 4.2 非同期イベントフロー
```yaml
event-driven-flow:
  UserRegistration:
    ①API: POST /users → 201
    ⚡events:
      - user.created → EmailService
      - user.created → AnalyticsService
      - user.created → WelcomeWorkflow
    
  EmailService:
    ◀user.created
    →validate.email
    →template.render
    ▶SMTP.send ⇒
    ⚡email.sent

  flow-guarantees:
    at-least-once: event-delivery
    idempotent: email-sending
    retry: 3×exponential-backoff
```

## 5. 実装時の詳細指示生成

### 5.1 AIへの実装指示テンプレート
```markdown
## 実装タスク: ユーザー認証API

### フロー仕様
```yaml
POST /auth/login:
  main: validate→find→compare→token→session→200
  error: 400|404|401|500
  deps: [UserRepo,Crypto,Token,Session]
  constraints: 5req/min, 3s-timeout
```

### 詳細実装手順
1. **入力検証**
   - email: RFC5322準拠
   - password: 8文字以上
   - →400: 即座にリターン

2. **ユーザー検索**
   - UserRepo.findByEmail(email)
   - →404: "user_not_found"
   - キャッシュ利用可(5min)

3. **パスワード検証**
   - bcrypt.compare(plain, user.hash)
   - →401: "invalid_password"
   - 失敗回数記録

4. **トークン生成**
   - JWT: 15min有効
   - Refresh: 7days有効
   - ペアで生成

5. **セッション作成**
   - トランザクション内で実行
   - 既存セッション無効化
   - →500: 全ロールバック

### 非機能要件
- レート制限: IP単位で5回/分
- レスポンス: <200ms(p95)
- ログ: 全認証試行を記録
```

### 5.2 実装確認用フロー図
```yaml
# 実装完了後の確認用フロー
implementation-verification:
  happy-path:
    POST{email,pass} → 200{token} ✓
    Header[token] → GET /me → 200{user} ✓
    
  error-paths:
    POST{invalid-email} → 400 ✓
    POST{unknown-email} → 404 ✓
    POST{wrong-pass} → 401 ✓
    POST×6[rate-limit] → 429 ✓
    
  edge-cases:
    POST{null-email} → 400 ✓
    POST{sql-injection} → 400 ✓
    POST[no-body] → 400 ✓
    Timeout(>3s) → 504 ✓
```

## 6. フロー設計のベストプラクティス

### 6.1 段階的詳細化
```yaml
# レベル1: 概要（20トークン）
login: auth→token→session

# レベル2: 主要ステップ（50トークン）  
login: validate→find→compare→generate→store→respond

# レベル3: 完全仕様（100トークン）
login:
  ①validate(email,pass) ↗400
  ②find(email) ↗404  
  ③compare(pass,hash) ↗401
  ④generate(user) ⇒ {token,refresh}
  ⑤store(session) 🔒
  ⑥respond(200,tokens)
```

### 6.2 重要ポイントの強調
```yaml
critical-points:
  🔒: トランザクション必須
  ⚡: 非同期処理OK  
  📍: ログ出力必須
  ⏱: タイムアウト設定必須
  🔐: セキュリティ確認必須
```

## 7. 自動フロー生成

### フロー生成スクリプト
```bash
#!/bin/bash
# generate-flow.sh

analyze_endpoint() {
  local method=$1
  local path=$2
  local handler=$3
  
  echo "=== Flow Analysis: $method $path ==="
  
  # 関数呼び出しチェーンを解析
  extract_call_chain $handler
  
  # エラーハンドリングを検出
  find_error_paths $handler
  
  # 外部依存を特定
  identify_dependencies $handler
  
  # フロー図を生成
  generate_flow_yaml
}
```

## まとめ

この詳細設計手法により：

1. **完全なフロー把握**: 全ての実行パスを可視化
2. **圧縮記述**: 100トークン以内で完全仕様
3. **実装精度向上**: 曖昧さのない明確な指示
4. **品質保証**: フロー検証による実装確認

実装前にフローを完全に定義することで、確実で効率的な実装を実現します。