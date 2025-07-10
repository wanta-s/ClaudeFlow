# 🚀 ClaudeFlow 使い方ガイド

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)

## 📋 概要

ClaudeFlowは、Claude Codeがより効率的にコードを生成できるように、プロジェクトの構造化と計画立案を支援するツールです。プロジェクトの「設計図」を作成することで、Claude Codeが体系的で一貫性のあるコードを生成できるようになります。

**現在のバージョン**: v2.1.0 | [変更履歴](../CHANGELOG.md)

## 🎯 ClaudeFlowの価値

### Claude Codeとの相乗効果

```
ClaudeFlow（設計）+ Claude Code（実装）= 高品質なコードベース
```

- **ClaudeFlow**: プロジェクトの全体像を設計
- **Claude Code**: 設計に基づいて実際のコードを生成

### 解決する課題

1. **構造の不明確さ** → 明確なプロジェクト構造を定義
2. **タスクの複雑さ** → 管理可能な単位に分解
3. **一貫性の欠如** → 標準化されたアプローチを提供

## 🔧 インストール方法

### 1. 最速インストール（推奨）

```bash
# Unix/Linux/Mac
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/install.sh | bash
```

### 2. インストール後の確認

```bash
# インストールされたファイルを確認
ls ~/.claude/
```

## 🎯 実践的な使い方

### ステップ1: プロジェクトの構造化

```bash
# ClaudeFlowディレクトリに移動
cd ClaudeFlow/scripts

# プロジェクト設計を開始
./start.sh
```

#### 対話例：
```
Project name: ECサイト
Description: モダンなECサイトの構築
Tech stack: Next.js, TypeScript, Prisma, PostgreSQL
Main features: 商品管理、カート機能、決済連携
```

### ステップ2: 生成されたドキュメントの確認

ClaudeFlowは以下のようなドキュメントを生成します：

```markdown
# ECサイト プロジェクト計画

## 概要
モダンなECサイトの構築

## 技術スタック
- Frontend: Next.js, TypeScript
- Backend: Prisma, PostgreSQL
- その他: Stripe決済API

## タスクリスト
1. [ ] データベース設計
2. [ ] 商品管理機能の実装
3. [ ] カート機能の実装
4. [ ] 決済連携の実装
...
```

### ステップ3: Claude Codeでの実装

生成されたドキュメントをClaude Codeに提供して実装を進めます：

#### 例1: 初期セットアップ
```
「このプロジェクト計画に基づいて、ECサイトの初期プロジェクト構造を作成してください。Next.js、TypeScript、Prismaを使用します。」
```

#### 例2: 機能実装
```
「タスク#1のデータベース設計に基づいて、Prismaスキーマを実装してください。商品、ユーザー、注文のモデルが必要です。」
```

#### 例3: 段階的な開発
```
「タスク#2の商品管理機能を実装してください。CRUD操作とページネーションを含めてください。」
```

## 💡 活用パターン

### パターン1: 新規プロジェクト立ち上げ

1. **設計フェーズ**（ClaudeFlow）
   ```bash
   ./start.sh
   # 全体構造を定義
   ```

2. **実装フェーズ**（Claude Code）
   ```
   「生成された設計書に基づいて、プロジェクトの基本構造を実装してください」
   ```

### パターン2: 機能追加

1. **機能設計**（ClaudeFlow）
   ```bash
   ./generate-tasks.sh
   # 新機能のタスクを生成
   ```

2. **機能実装**（Claude Code）
   ```
   「ユーザー認証機能のタスクリストに従って実装を進めてください」
   ```

### パターン3: リファクタリング

1. **現状分析**（ClaudeFlow）
   - 既存コードの課題を整理
   - 改善計画を文書化

2. **段階的改善**（Claude Code）
   ```
   「リファクタリング計画に基づいて、ステップ1から順に実行してください」
   ```

## 📊 実例：Todoアプリ開発

### 1. ClaudeFlowで設計

```bash
./start.sh
# 入力内容:
# - Project: TodoApp
# - Stack: React, TypeScript, Express
# - Features: タスク管理、カテゴリ分け、期限設定
```

### 2. 生成される構造

```
TodoApp/
├── docs/
│   ├── project_plan.md      # 全体計画
│   ├── task_breakdown.md    # タスク分解
│   └── tech_specs.md        # 技術仕様
├── frontend/                # React アプリ
├── backend/                 # Express API
└── shared/                  # 共有型定義
```

### 3. Claude Codeへの指示

```
「project_plan.mdに基づいて、TodoAppのフロントエンド基本構造を実装してください。TypeScriptとReact Hooksを使用し、コンポーネントは機能別に整理してください。」
```

### 4. 結果

Claude Codeが以下を生成：
- 整理されたコンポーネント構造
- 型安全なTypeScript実装
- 計画に沿った機能実装

## ⚡ プロのヒント

### 1. 詳細な設計 = 良質なコード

ClaudeFlowで詳細に設計するほど、Claude Codeはより適切なコードを生成します。

### 2. 段階的な実装

大きなプロジェクトは小さなタスクに分解して、一つずつClaude Codeに実装を依頼します。

### 3. フィードバックループ

```
設計 → 実装 → レビュー → 設計の更新
```

### 4. テンプレートのカスタマイズ

プロジェクトに合わせてテンプレートをカスタマイズ：

```bash
# 独自テンプレートを追加
cp my-template.md ClaudeFlow/tasks/
```

## 🛠️ 高度な使い方

### カスタムワークフロー

```bash
# 独自のワークフローを作成
cd ClaudeFlow/scripts
./interactive-planning.sh

# 詳細な技術仕様を生成
./generate-tasks.sh --detailed
```

### CI/CDとの連携

生成されたドキュメントをGitで管理し、プロジェクトの進捗を追跡：

```bash
git add docs/
git commit -m "Add project planning documents"
```

## 🆘 トラブルシューティング

### Claude Codeが計画を理解できない場合

1. より具体的な説明を追加
2. タスクをさらに細分化
3. 技術的な制約を明記

### 生成されたコードが期待と異なる場合

1. 設計ドキュメントを見直し
2. より詳細な要件を追加
3. 段階的に実装を進める

## 📚 さらに詳しく

- [英語版README](../README.md)
- [設定ファイルについて](../CLAUDE.md)
- [テンプレート一覧](../ClaudeFlow/tasks/)

## 🤝 サポート

問題や質問がある場合：
- GitHubでIssueを作成
- より良いテンプレートの提案
- Claude Codeとの連携改善アイデア

---

ClaudeFlowとClaude Codeを組み合わせることで、より効率的で体系的な開発が可能になります。