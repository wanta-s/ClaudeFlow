# ClaudeFlow (CF)

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/LICENSE)
[![Status](https://img.shields.io/badge/status-開発中-orange.svg)](#開発状況)

**ClaudeFlow** は、Claude Codeがより効率的にコードを生成できるように、プロジェクトの構造化と計画立案を支援するツールです。

## ⚠️ 開発状況

**現在、ClaudeFlowは仮実装段階です。一部の機能は正常に動作しない可能性があります。**

### 既知の問題
- 実装モードの一部で機能生成が不完全な場合があります
- WSL環境でjqコマンドが必要です（代替としてPythonを使用）
- 文字化けが発生する環境があります（UTF-8エンコーディング設定で対応中）

### 動作確認済みの機能
- 基本的なプロジェクト構造の生成
- タスクテンプレートの生成
- 要件定義フェーズの実行
- **🔒 自動認証システム** - パスワード・認証情報の自動生成・管理

正式リリースまでお待ちください。開発の進捗は[Issues](https://github.com/wanta-s/ClaudeFlow/issues)でご確認いただけます。

## ClaudeFlowの役割

ClaudeFlowは「プロジェクトの設計図」を作成し、Claude Codeが体系的にコードを生成できるようにします：

1. **プロジェクト構造の明確化** - 開発前に全体像を整理
2. **タスクの体系化** - 複雑な開発を管理可能な単位に分割
3. **開発フローの標準化** - 一貫性のある開発プロセスを提供
4. **🔒 セキュリティ自動化** - 認証情報の自動生成と安全な管理
5. **⚡ 軽量化対応** - 簡単なアプリ向けの高速開発モード
6. **🎯 CodeFit Design** - 行数制限による制約駆動開発
7. **🌐 日本語対応強化** - Claude AIによる自然な日本語→英語プロジェクト名変換

## 🎯 CodeFit Design（行数設計法）

ClaudeFlowは**CodeFit Design**という新しい設計手法を採用しています：

### 核心理念
- **制約から創造性** - 行数制限が生む本質的な機能設計
- **ユーザーとの協働** - 制約を共有し、一緒に最適解を探る
- **品質重視** - 機能数より使いやすさと安定性を優先
- **継続的改善** - 制約内での最適化を繰り返す

### 行数制限システム
```bash
超軽量モード: 800行以内
軽量モード: 1500行以内
標準モード: 2000行以内
```

### 詳細情報
- 📖 [CodeFit Design 哲学](docs/CODEFIT-DESIGN.md)
- 🛠️ [実践手法](docs/CODEFIT-METHODOLOGY.md)

## 開発モード

### 🚀 超軽量モード（推奨：簡単なアプリ）
```bash
./start.sh  # → 1) 超軽量モード を選択
```
- **対象**: オセロゲーム、計算機、簡単なWebアプリ
- **時間**: 5分で完成
- **フェーズ**: 3つ（企画+要件 → 実装+テスト → 完成）
- **成果物**: 動作するHTMLファイル + 統合ドキュメント

### ⚡ 軽量モード（推奨：中程度のアプリ）
```bash
export CLAUDEFLOW_MODE=light
./run-pipeline.sh input.md
```
- **対象**: TODOアプリ、簡単なCRUDアプリ
- **時間**: 10-15分
- **フェーズ**: 5つ（企画 → 要件 → プロトタイプ → 実装 → テスト）

### 📋 標準モード（推奨：本格的なアプリ）
```bash
./start.sh  # → 3) 詳細設定 を選択
```
- **対象**: 業務システム、複雑なWebアプリ
- **時間**: 30-60分
- **フェーズ**: 9つ（全工程）

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

## 🌐 日本語対応機能

ClaudeFlowは日本語での開発を強力にサポートします：

### 日本語プロジェクト名の自動変換
```bash
# 入力: 家計簿アプリ
# 出力: household-budget-app/

# 入力: 英単語学習ツール
# 出力: english-vocabulary-app/
```

### 変換方式（優先順位）
1. **Claude AI変換** - 意味を理解した自然な英語名
2. **辞書マッピング** - 56個の事前定義された変換
3. **ローマ字変換** - ひらがな・カタカナの機械的変換
4. **タイムスタンプ** - 変換不可能な場合の一意性確保

### 設定方法
```bash
# Claude変換を無効化（高速化したい場合）
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=false

# Claude変換を有効化（デフォルト）
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=true
```

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
- **start.sh** - インタラクティブなプロジェクト設定（軽量モード選択可能）
- **ultra-light.sh** - 超軽量モード（3フェーズ、5分で完成）
- **quick-start.sh** - クイックスタート（自動クリーンアップ機能付き）
- **generate-tasks.sh** - タスク生成
- **interactive-planning.sh** - 詳細計画の作成
- **manage-projects.sh** - プロジェクト管理ユーティリティ
- **generate-unified-docs.sh** - 統合ドキュメント生成
- **set-light-mode.sh** - 軽量モード設定

### 環境変数設定

ClaudeFlowの動作は以下の環境変数で設定できます：

#### タイムアウト設定
```bash
export CLAUDEFLOW_TIMEOUT_SPEC=900     # 機能仕様生成のタイムアウト（秒）
export CLAUDEFLOW_TIMEOUT_IMPL=600     # 実装生成のタイムアウト（秒）
export CLAUDEFLOW_TIMEOUT_TEST=450     # テスト生成のタイムアウト（秒）
export CLAUDEFLOW_TIMEOUT_DEFAULT=600  # その他のタイムアウト（秒）
```

#### 実行制御
```bash
export CLAUDEFLOW_IMPL_LEVEL=2         # 実装レベル（1=ラフ、2=標準、3=商用）
export CLAUDEFLOW_FEATURE_SELECTION=C  # 機能選択（A=全て、C=コア機能のみ）
export AUTO_CONTINUE=true              # 自動継続モード
export CLAUDEFLOW_QUIET_MODE=true      # 簡潔表示モード
export CLAUDEFLOW_FORCE_FEATURES_REUSE=false  # 既存features.json強制使用（デフォルト: false）
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=true  # Claude AIによる日本語変換（デフォルト: true）
export CLAUDEFLOW_AUTO_FEATURES=true   # 機能の自動選択（デフォルト: true）
```

#### プロジェクト管理
```bash
# プロジェクト状態の確認
./scripts/manage-projects.sh status

# プロジェクトのクリア
./scripts/manage-projects.sh clean

# プロジェクト一覧の表示
./scripts/manage-projects.sh list
```

**タイムアウト設定の使用例：**
```bash
# 大規模な機能仕様生成の場合、タイムアウトを15分に延長
export CLAUDEFLOW_TIMEOUT_SPEC=900
./hybrid-implementation.sh requirements.md design.md
```

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
- [繰り返し実装とテスト](./docs/ITERATIVE-IMPLEMENTATION.md)
- [自動インクリメンタル実装](./docs/AUTO-INCREMENTAL-IMPLEMENTATION.md)
- [🔒 自動認証システム](./docs/SECURITY-AUTO-AUTH.md)
- [🧹 クリーンアップガイド](./docs/CLEANUP-GUIDE.md)
- [設定ファイルについて](./CLAUDE.md)
- [変更履歴](./CHANGELOG.md)

## 貢献

プルリクエストを歓迎します！特に：
- より実践的なテンプレート
- Claude Codeとの連携改善
- ワークフローの最適化

## ライセンス

MIT License