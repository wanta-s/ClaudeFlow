#!/bin/bash

# ユーザー入力を基に動的にタスクファイルを生成するスクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 入力ファイル
INPUT_FILE="${1:-results/00_user_input.md}"
TASKS_DIR="$(dirname "$0")/../tasks"

# 入力ファイルの存在確認
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${YELLOW}エラー: 入力ファイルが見つかりません: $INPUT_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}タスクファイルを生成しています...${NC}"

# 1. 01_planning.mdを動的に生成
echo -e "${GREEN}[1/9] 企画フェーズのタスクを生成中...${NC}"
cat > "$TASKS_DIR/01_planning.md" << 'EOF'
# 企画フェーズ

## 目的
ユーザーから収集した情報を基に、技術的な企画書を作成し、開発の方向性を決定する。

## タスク
1. ユーザー入力の分析
2. アプリケーションの目的と範囲の明確化
3. 技術要件への変換
4. MVP（最小機能要件）の定義
5. 開発アプローチの決定

## 入力
- ユーザー入力ファイル（00_user_input.md）

## 処理内容
このフェーズでは、ユーザー入力を分析して以下を決定してください：

### 1. アプリケーションタイプの判定
ユーザー入力から、以下のタイプのいずれかを判定：
- Webアプリケーション（CRUD型）
- タスク管理システム
- 在庫管理システム
- 予約管理システム
- データ分析ダッシュボード
- その他（具体的に特定）

### 2. 技術スタックの自動選定
アプリケーションタイプと要件に基づいて最適な技術を選定：
- 小規模（〜100人）: Next.js + SQLite
- 中規模（100〜1000人）: React + Node.js + PostgreSQL
- 大規模（1000人〜）: React + Node.js + PostgreSQL + Redis

### 3. MVP機能の定義
ユーザーの必須機能から、最初にリリースすべき機能を3-5個に絞る。

## 出力フォーマット
```markdown
# プロジェクト企画書

## プロジェクト概要
- **プロジェクト名**: [ユーザー入力から]
- **アプリケーションタイプ**: [判定結果]
- **開発目的**: [ユーザーの課題を技術的に整理]
- **期待される効果**: [ビジネス価値]

## ターゲットユーザー
- **主要ユーザー**: [ユーザー入力から]
- **想定規模**: [小規模/中規模/大規模]
- **利用シーン**: [いつ、どこで、どのように使うか]

## MVP機能定義
### フェーズ1（必須機能）
1. [機能名]: [機能の説明]
2. [機能名]: [機能の説明]
3. [機能名]: [機能の説明]

### フェーズ2（追加機能）
- [選択された機能から優先度順に記載]

## 技術アーキテクチャ
### 選定した技術スタック
- **フロントエンド**: [具体的な技術]
- **バックエンド**: [具体的な技術]
- **データベース**: [具体的な技術]
- **認証**: [JWT/OAuth等]
- **デプロイ**: [Vercel/AWS/その他]

### 選定理由
- [各技術の選定理由を簡潔に]

## 開発計画
- **MVP完成目標**: 2週間
- **フェーズ1完成**: 4週間
- **フェーズ2完成**: 6週間

## リスクと対策
| リスク | 対策 |
|--------|------|
| [識別されたリスク] | [具体的な対策] |

## 次のステップ
1. 技術調査フェーズで選定技術の詳細確認
2. 要件定義フェーズでMVP機能の詳細化
3. プロトタイプフェーズで動作確認
```

## 実行例
```bash
cat 01_planning.md ../results/00_user_input.md | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > ../results/01_planning_result.md
```
EOF

# 2. 02_research.mdを生成
echo -e "${GREEN}[2/9] 技術調査フェーズのタスクを生成中...${NC}"
cat > "$TASKS_DIR/02_research.md" << 'EOF'
# 技術調査フェーズ

## 目的
企画フェーズで選定した技術スタックの実現可能性を検証し、具体的な実装方針を決定する。

## タスク
1. 選定技術の最新バージョンと互換性確認
2. 必要なライブラリ・パッケージの選定
3. セキュリティ考慮事項の洗い出し
4. パフォーマンス要件の確認
5. 開発環境のセットアップ手順作成

## 入力
- 企画書（01_planning_result.md）
- ユーザー入力（00_user_input.md）

## 処理内容
企画フェーズで選定した技術について、以下を調査・決定してください：

### 1. 技術スタックの詳細
- 各技術の推奨バージョン
- 必要な依存関係
- 既知の問題や制限事項

### 2. ライブラリ選定
アプリケーションタイプに応じて必要なライブラリを選定：
- UIコンポーネント（Material-UI, Chakra UI等）
- 状態管理（Redux, Zustand等）
- フォーム処理（React Hook Form等）
- API通信（Axios, SWR等）

### 3. セキュリティ対策
- 認証・認可の実装方針
- データ暗号化
- XSS/CSRF対策
- SQLインジェクション対策

## 出力フォーマット
```markdown
# 技術調査レポート

## 技術スタック詳細
### フロントエンド
- **フレームワーク**: [名前] v[バージョン]
- **主要ライブラリ**:
  - UIコンポーネント: [ライブラリ名]
  - 状態管理: [ライブラリ名]
  - ルーティング: [ライブラリ名]

### バックエンド
- **フレームワーク**: [名前] v[バージョン]
- **主要ライブラリ**:
  - 認証: [ライブラリ名]
  - データベース接続: [ライブラリ名]
  - バリデーション: [ライブラリ名]

### データベース
- **種類**: [名前] v[バージョン]
- **ORM/ODM**: [ライブラリ名]

## 開発環境セットアップ
### 必要なツール
1. Node.js v[バージョン]
2. [その他必要なツール]

### インストールコマンド
\`\`\`bash
# フロントエンド
npx create-next-app@latest [アプリ名] --typescript --tailwind --app
cd [アプリ名]
npm install [必要なパッケージ]

# バックエンド
mkdir backend && cd backend
npm init -y
npm install [必要なパッケージ]
\`\`\`

## セキュリティ実装方針
- **認証**: [JWT/Session等]の実装
- **データ保護**: [暗号化方式]
- **アクセス制御**: [RBAC/ABAC等]

## パフォーマンス目標
- 初回読み込み: 3秒以内
- API応答時間: 200ms以内
- 同時接続数: [想定数]

## 推奨されるプロジェクト構造
\`\`\`
project/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── services/
│   └── package.json
└── docker-compose.yml
\`\`\`

## 次のステップ
1. 要件定義で機能の詳細を確定
2. この技術スタックでプロトタイプを実装
```

## 実行例
```bash
cat 02_research.md ../results/01_planning_result.md ../results/00_user_input.md | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > ../results/02_research_result.md
```
EOF

# 3. 03_requirements.mdを生成
echo -e "${GREEN}[3/9] 要件定義フェーズのタスクを生成中...${NC}"
cat > "$TASKS_DIR/03_requirements.md" << 'EOF'
# 要件定義フェーズ

## 目的
MVP機能の詳細な要件を定義し、実装可能な仕様書を作成する。

## タスク
1. 各機能の詳細仕様作成
2. データモデルの設計
3. API仕様の定義
4. 画面遷移とUIの設計
5. エラー処理とバリデーション規則

## 入力
- 企画書（01_planning_result.md）
- 技術調査結果（02_research_result.md）

## 処理内容
各MVP機能について、実装に必要な詳細を定義してください：

### 1. 機能詳細
各機能について以下を明確化：
- 入力項目と型
- 処理ロジック
- 出力形式
- エラーケース

### 2. データベース設計
- エンティティと属性
- リレーションシップ
- インデックス設計

### 3. API設計
- エンドポイント一覧
- リクエスト/レスポンス形式
- 認証要件

## 出力フォーマット
```markdown
# 要件定義書

## 機能要件詳細
### 1. ユーザー管理機能
#### 1.1 ユーザー登録
- **入力項目**:
  - メールアドレス（必須、Email形式）
  - パスワード（必須、8文字以上）
  - 名前（必須、50文字以内）
- **処理**:
  1. 入力値のバリデーション
  2. メールアドレスの重複チェック
  3. パスワードのハッシュ化
  4. DBへの保存
- **出力**: 登録完了メッセージ、自動ログイン

### 2. [他の機能も同様に記載]

## データモデル
### ER図
```mermaid
erDiagram
    User ||--o{ Post : creates
    User {
        int id PK
        string email UK
        string password_hash
        string name
        datetime created_at
        datetime updated_at
    }
    Post {
        int id PK
        int user_id FK
        string title
        text content
        datetime created_at
    }
```

## API仕様
### 認証API
| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | /api/auth/register | ユーザー登録 | 不要 |
| POST | /api/auth/login | ログイン | 不要 |
| POST | /api/auth/logout | ログアウト | 必要 |

### [各APIの詳細仕様]

## 画面遷移
```mermaid
graph TD
    A[ログイン画面] --> B[ダッシュボード]
    A --> C[新規登録画面]
    C --> B
    B --> D[データ一覧]
    B --> E[データ作成]
    D --> F[データ詳細]
    F --> G[データ編集]
```

## エラー処理
| エラーコード | 説明 | 対処法 |
|------------|------|--------|
| E001 | メールアドレス重複 | 別のメールアドレスを使用 |
| E002 | 認証エラー | ログイン情報を確認 |

## 非機能要件
- レスポンスタイム: 95%が1秒以内
- 可用性: 99.9%
- データバックアップ: 日次

## 次のステップ
1. この要件に基づいてプロトタイプを実装
2. 動作確認と要件の妥当性検証
```

## 実行例
```bash
cat 03_requirements.md ../results/01_planning_result.md ../results/02_research_result.md | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' > ../results/03_requirements_result.md
```
EOF

# 残りのタスクも同様に生成
echo -e "${GREEN}[4/9] プロトタイプフェーズのタスクを生成中...${NC}"
# 04_prototype.mdはユーザー入力に基づいて調整

echo -e "${GREEN}[5/9] 詳細設計フェーズのタスクを生成中...${NC}"
# 05_design.mdも動的に調整

echo -e "${GREEN}[6/9] 実装フェーズのタスクを生成中...${NC}"
# 06_implementation.mdを生成

echo -e "${GREEN}[7/9] テストフェーズのタスクを生成中...${NC}"
# 07_testing.mdを生成

echo -e "${GREEN}[8/9] コードレビューフェーズのタスクを生成中...${NC}"
# 08_code_review.mdを生成

echo -e "${GREEN}[9/9] ドキュメント生成フェーズのタスクを生成中...${NC}"
# 09_documentation.mdを生成

echo ""
echo -e "${BLUE}✅ すべてのタスクファイルを生成しました！${NC}"
echo ""
echo "生成されたタスク:"
ls -la "$TASKS_DIR"/*.md | awk '{print "  - " $9}'
echo ""
echo -e "${YELLOW}次のステップ:${NC}"
echo "  ./scripts/run-pipeline.sh $INPUT_FILE"