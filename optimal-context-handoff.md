# 最小限かつ最大効果のコンテキスト引き継ぎ戦略

## 概要
情報量は最小限に抑えながら、次フェーズのAIが最大限の効果を発揮できる高密度コンテキスト設計。

## 情報密度最適化の原則

### 1. セマンティック圧縮
```yaml
# ❌ 冗長な引き継ぎ
実装内容:
  UserServiceクラスを作成しました。
  このクラスにはcreateUser、updateUser、deleteUser、
  findUserByIdメソッドがあります。
  データベースにはPrismaを使用しています。

# ✅ 高密度な引き継ぎ
実装:
  UserService[CRUD]: prisma
    - create(dto: CreateUserDTO): User
    - update(id, dto: UpdateUserDTO): User  
    - delete(id): boolean
    - findById(id): User?
  統合: app.ts L45-47
```

### 2. 記号化による圧縮
```yaml
記号体系:
  []: 機能カテゴリ
  →: 依存/使用
  ←: 被依存/被使用
  ↔: 相互依存
  !: 要注意/問題あり
  ?: 未確定/要検討
  #: private/内部
  $: static
  @: デコレータ使用
  *: 非同期
```

## フェーズ別最適引き継ぎテンプレート

### 1. 実装→リファクタリング

#### 最小×最大効果の引き継ぎ
```yaml
# コンテキストヘッダー（30トークン）
phase: impl→refactor
focus: quality+performance
constraints: no-breaking-changes

# 実装サマリー（100トークン）
files:
  auth/:
    AuthService[認証]: jwt+bcrypt
      *login(email,pass)→token !validation
      *refresh(token)→token
      *logout(token)→void
    AuthMiddleware[@装飾]: express
      *verify(req)→user|401
    types.ts: {User,Token,LoginDTO}

integration:
  app.ts+3L: middleware.use()
  db: users,tokens表

issues:
  !login: 入力検証が基本的
  !token: 有効期限ハードコード
  ?error: 汎用エラーメッセージ

metrics:
  loc: 245
  complexity: 8
  duplication: 15%
```

### 2. リファクタリング→テスト

#### テストに必要な本質情報
```yaml
# コンテキストヘッダー（20トークン）
phase: refactor→test
target: 100%coverage+security
search: required

# API仕様（80トークン）
public:
  AuthService:
    *login(email:string,pass:string)→{token,refresh,user}
      throws: InvalidCredentials,UserNotFound,UserLocked
      sla: <200ms
      security: rate-limit:5/min
    
    *refresh(token:string)→{token,refresh}
      throws: TokenExpired,TokenInvalid
      constraint: old-token-blacklist
    
    *logout(token:string)→void
      effect: token→blacklist

edge-cases:
  - null/undefined入力
  - SQLi: email="' OR '1'='1"
  - 同時ログイン制限
  - トークン再利用攻撃

test-hints:
  mock: jwt,bcrypt,prisma
  focus: security>performance>usability
```

### 3. テスト→実装（フィードバック）

#### 修正に必要な最小コンテキスト
```yaml
# 問題特定（50トークン）
test-result: FAIL
coverage: 85%
failures:
  AuthService.login:
    L45: !email.match(regex) → NPE
    L52: prisma.raw(query) → SQLi vulnerable
    missing: rate-limit実装なし

fix-required:
  1. email?検証→early-return
  2. prisma.raw→prisma.user.findUnique
  3. +rate-limit: express-rate-limit

impact: minimal
files: AuthService.ts only
```

## 高度な圧縮テクニック

### 1. パターン参照
```yaml
# 冗長な記述を避ける
patterns:
  CRUD: create,read,update,delete
  REST: GET,POST,PUT,DELETE
  AUTH: login,logout,refresh,verify

usage:
  UserController[REST+CRUD]: express
  AuthService[AUTH]: jwt
```

### 2. 差分記述
```yaml
# 変更点のみを伝達
refactored:
  base: v1.0
  changes:
    -UserService.createUser(): 35行
    +UserService.create(): 15行
    +UserValidator.validate(): 10行
    moved: validation→separate
    improved: complexity 12→6
```

### 3. 構造化要約
```yaml
# 階層的な情報整理
system:
  layers: [controller,service,repository]
  flow: HTTP→validate→business→persist
  
components:
  critical: [auth,payment,user]
  standard: [profile,settings]
  utility: [logger,cache]

dependencies:
  external: [jwt,bcrypt,prisma]
  internal: [config,utils]
```

## 効果測定メトリクス

### コンテキスト効率指標
```yaml
効率性:
  情報密度: 有効情報/総トークン数
  理解速度: 把握時間/情報量
  実装精度: 正確な実装/全実装
  
目標値:
  情報密度: >0.8
  理解速度: <30秒/100トークン
  実装精度: >0.95
```

## 実践例：認証システムの完全な引き継ぎ

### Phase 1→2（実装→リファクタリング）
```yaml
# 45トークンで完全な状況把握
impl-summary:
  auth/[jwt+express]:
    Service: login!,logout,refresh
    Guard: @verify→req.user
    Issue: !validation,!hardcode
  impact: app.ts+3L
  next: quality>security>perf
```

### Phase 2→3（リファクタリング→テスト）
```yaml
# 60トークンで完全なテスト設計
test-spec:
  api: {login(email,pass),logout(token),refresh(token)}
  edge: [null,sqli,race,replay]
  sla: [<200ms,5req/min]
  mock: [jwt,db,bcrypt]
  search: "jwt testing best practices"
```

### Phase 3→1（テスト→実装修正）
```yaml
# 35トークンで正確な修正指示
fix:
  AuthService.login:
    L45: +if(!email)throw
    L52: -raw→.findUnique
    +rate: express-rate-limit
  coverage: 85→100%
```

## ベストプラクティス

### 1. 情報の優先順位
```yaml
必須（常に含める）:
  - 公開API仕様
  - 重大な問題点
  - 統合ポイント
  
条件付き（必要時のみ）:
  - パフォーマンス指標
  - 内部実装詳細
  - 設定値
  
不要（含めない）:
  - コメント
  - インポート文
  - 定型コード
```

### 2. 記述の標準化
```yaml
標準フォーマット:
  位置: path/file.ts:L行番号
  メソッド: name(params):return
  問題: !マーク+簡潔な説明
  依存: →矢印で表現
```

### 3. コンテキストの検証
```yaml
チェックリスト:
  □ 次フェーズの目的が明確か
  □ 必要な情報は全て含まれているか
  □ 不要な詳細は削除したか
  □ 記号化で圧縮できているか
  □ 50-100トークンに収まっているか
```

## 自動化ツール

### コンテキスト生成スクリプト
```bash
#!/bin/bash
# generate-context.sh

generate_handoff() {
  local from_phase=$1
  local to_phase=$2
  
  case "$from_phase-$to_phase" in
    "impl-refactor")
      echo "files:"
      find . -name "*.ts" -newer $LAST_PHASE | while read f; do
        echo "  ${f}[$(get_category $f)]: $(get_tech $f)"
        extract_public_api $f
      done
      echo "issues:"
      grep -r "TODO\|FIXME\|XXX" --include="*.ts" | head -5
      ;;
    "refactor-test")
      echo "public:"
      extract_all_public_apis
      echo "edge-cases:"
      suggest_edge_cases
      ;;
  esac
}
```

## まとめ

最小×最大効果の引き継ぎにより：

1. **情報密度**: 80%以上の有効情報率
2. **理解速度**: 30秒以内での完全把握
3. **実装精度**: 95%以上の正確性
4. **トークン効率**: 50-100トークンで完結

記号化、構造化、差分記述を活用し、次フェーズのAIが即座に本質を理解し、最大の効果を発揮できるコンテキストを実現します。