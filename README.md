# ClaudeFlow (CF)

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**ClaudeFlow** は、Claude Codeがより効率的にコードを生成できるように、プロジェクトの構造化と計画立案を支援するツールです。

## ClaudeFlowの役割

ClaudeFlowは「プロジェクトの設計図」を作成し、Claude Codeが体系的にコードを生成できるようにします：

1. **プロジェクト構造の明確化** - 開発前に全体像を整理
2. **タスクの体系化** - 複雑な開発を管理可能な単位に分割
3. **開発フローの標準化** - 一貫性のある開発プロセスを提供

## Claude Codeとの連携フロー

```
1. ClaudeFlowでプロジェクト構造を定義
   ↓
2. タスクと要件を整理したドキュメントを生成
   ↓
3. Claude Codeがドキュメントを参照しながらコードを生成
   ↓
4. 体系的で一貫性のあるコードベースが完成
```

## 実際の効果

### ClaudeFlowなしの場合：
- 場当たり的なコード生成
- 全体の一貫性が保ちにくい
- 複雑なプロジェクトで迷走しやすい

### ClaudeFlowありの場合：
- 明確な設計に基づいたコード生成
- プロジェクト全体の一貫性を維持
- 複雑なプロジェクトも段階的に実装

## インストール

### 前提条件
- Claude Code（コード生成用）
- Node.js（インストーラー実行用）
- Unix/Linux/Mac環境

### クイックインストール

```bash
# ワンライナーインストール
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/install.sh | bash
```

### 手動インストール

```bash
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ClaudeFlow
node scripts/install-mcp-tools.js
```

## 使い方

### 1. プロジェクトの構造化

```bash
cd ClaudeFlow/scripts
./start.sh
```

対話的にプロジェクト情報を入力すると、以下が生成されます：
- プロジェクト概要ドキュメント
- タスク分解リスト
- 実装計画

### 2. Claude Codeでの開発

生成されたドキュメントをClaude Codeに渡して：

```
「このプロジェクト計画に基づいて、[具体的な機能]を実装してください」
```

Claude Codeは構造化された計画を参照しながら、一貫性のあるコードを生成します。

### 3. コンテキストを意識した段階的な実装

タスクを小さく分割し、各ステップでテストしながら進めます：

```
1. 最小単位の実装：
   「商品モデルの基本的なCRUD機能を実装してください（Create, Read, Update, Delete）」
   
2. 動作確認：
   「実装した機能のユニットテストを作成してください」
   
3. 次の層を追加：
   「商品モデルにカテゴリ機能を追加してください。既存のテストが通ることを確認してください」
   
4. 統合：
   「商品APIのエンドポイントを実装してください。Swagger仕様も含めてください」
```

**重要**: 各ステップは独立してテスト可能で、前のステップの成果物を壊さないように設計します。

## 含まれるコンポーネント

### プロジェクトテンプレート
- **01_planning.md** - プロジェクト計画の雛形
- **02_research.md** - 技術調査の記録
- **03_requirements.md** - 要件定義
- **04_prototype.md** - プロトタイプ設計
- **05_design.md** - 詳細設計
- **06_implementation.md** - 実装計画
- **07_testing.md** - テスト計画
- **08_code_review.md** - レビューチェックリスト
- **09_documentation.md** - ドキュメント計画

### 支援スクリプト
- **start.sh** - インタラクティブなプロジェクト設定
- **generate-tasks.sh** - タスク生成
- **interactive-planning.sh** - 詳細計画の作成

## 実例

### Webアプリケーション開発

1. ClaudeFlowでプロジェクト構造を定義：
```bash
./start.sh
# Project name: TodoApp
# Description: A modern todo list application
# Tech stack: React, TypeScript, Node.js
```

2. 生成された計画をClaude Codeに提供：
```
「生成されたプロジェクト計画に基づいて、TodoAppのフロントエンド構造を実装してください」
```

3. Claude Codeが体系的にコードを生成：
- 定義されたディレクトリ構造に従う
- 指定された技術スタックを使用
- タスクリストに沿って実装

## プロジェクト構成

```
ClaudeFlow/
├── README.md                # このファイル
├── CLAUDE.md               # Claude Code連携設定
├── package.json            # npm設定
├── scripts/                # インストール・管理
│   └── install-mcp-tools.js
├── ClaudeFlow/             # プロジェクトテンプレート
│   ├── scripts/            # 構造化スクリプト
│   ├── tasks/              # フェーズ別テンプレート
│   └── templates/          # 追加テンプレート
└── docs/                   # ドキュメント
    └── USAGE-JP.md         # 日本語ガイド
```

## なぜClaudeFlowが必要か

Claude Codeは強力なコード生成能力を持っていますが、大規模プロジェクトでは：
- 全体像の把握が困難
- 一貫性の維持が課題
- 複雑な要件の管理が煩雑

ClaudeFlowはこれらの課題を解決し、Claude Codeの能力を最大限に引き出します。

## コンテキストエンジニアリングの哲学

### 小さく作って、小さくテストする

Claude Codeには**コンテキストウィンドウ**（一度に処理できる情報量）の制限があります。ClaudeFlowはこの制限を前提に、効率的な開発フローを提供します：

```
小さな単位で実装 → テスト → 次の小さな単位 → 最終的に大きなシステム
```

### なぜこのアプローチが重要か

1. **コンテキストの最適化**
   - 各実装ステップで必要最小限の情報のみを扱う
   - Claude Codeが混乱せず、正確なコードを生成

2. **早期の問題発見**
   - 小さな単位でテストすることで、問題を即座に発見
   - 修正が簡単で、影響範囲が限定的

3. **段階的な構築**
   - 動作確認済みの部品を組み合わせて大きなシステムを構築
   - 各ステップで品質が保証される

### 実践例

```bash
# ❌ 悪い例：一度に全機能を要求
"ECサイト全体を実装してください"

# ✅ 良い例：段階的な実装
"まず商品モデルのCRUD APIを実装してください"
→ テスト
"次にカート機能のAPIを追加してください"
→ テスト
"決済機能を統合してください"
→ テスト
```

## ドキュメント

- [日本語使い方ガイド](./docs/USAGE-JP.md)
- [開発フローチャート](./docs/DEVELOPMENT-FLOW.md)
- [ハイブリッド実装ガイド](./docs/HYBRID-IMPLEMENTATION.md)
- [設定ファイルについて](./CLAUDE.md)
- [変更履歴](./CHANGELOG.md)

## 貢献

プルリクエストを歓迎します！特に：
- より実践的なテンプレート
- Claude Codeとの連携改善
- ワークフローの最適化

## ライセンス

MIT License