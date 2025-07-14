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
