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
