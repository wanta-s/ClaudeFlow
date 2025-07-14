# 🚀 ClaudeFlow 使い方ガイド

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)
[![Status](https://img.shields.io/badge/status-開発中-orange.svg)](#開発状況)

## ⚠️ 開発状況

**現在、ClaudeFlowは仮実装段階です。一部の機能は正常に動作しない可能性があります。**

詳細は[README.md](../README.md#開発状況)をご確認ください。

## 📋 概要

ClaudeFlowは、Claude Codeがより効率的にコードを生成できるように、プロジェクトの構造化と計画立案を支援するツールです。プロジェクトの「設計図」を作成することで、Claude Codeが体系的で一貫性のあるコードを生成できるようになります。

**現在のバージョン**: v2.5.0 | [変更履歴](../CHANGELOG.md)

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

## 🧠 コンテキストエンジニアリングの重要性

### コンテキストウィンドウを意識した開発

Claude Codeは一度に処理できる情報量（コンテキストウィンドウ）に制限があります。この制限を理解し、活用することが成功の鍵です。

### 小さく作って、小さくテストする

```
❌ 従来のアプローチ：
大きな機能を一度に実装 → 複雑なデバッグ → 手戻りが多い

✅ コンテキストエンジニアリング：
小さな機能 → テスト → 次の小さな機能 → 統合 → 大きなシステム
```

### 具体例：ユーザー認証システムの構築

```bash
# ステップ1: 基本的なユーザーモデル（30行程度）
「Userモデルを作成してください。email, password_hashのフィールドのみ」
→ 動作確認

# ステップ2: パスワードハッシュ機能（20行程度）
「bcryptを使ったパスワードハッシュ機能を追加してください」
→ ユニットテスト作成

# ステップ3: 認証ロジック（40行程度）
「ログイン認証のロジックを実装してください」
→ 統合テスト

# ステップ4: JWTトークン（30行程度）
「JWT トークンの生成と検証を追加してください」
→ エンドツーエンドテスト
```

**結果**: 各ステップが明確で、問題があればすぐに特定可能

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
   # コンテキストエンジニアリング実装が自動的に実行
   # 各機能に対して：
   # - 仕様生成
   # - 最小実装
   # - リファクタリング
   # - テスト生成
   # - 最適化
   # - パターンライブラリ更新
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

### 1. コンテキストウィンドウの最適活用

```bash
# 🎯 効果的な指示の例
「ProductモデルのCRUD APIを実装してください。
既存のUserモデルと同じパターンを使用し、
以下のフィールドを含めてください：name, price, description」

# 理由：既存のパターンを参照することで、少ない情報で一貫性のある実装が可能
```

### 2. 段階的な実装とテスト

```bash
# 各ステップでの確認項目
1. 単体機能の実装（50-100行）
   → 「この機能の単体テストを書いてください」
   
2. 機能の統合（100-200行）
   → 「既存機能との統合テストを追加してください」
   
3. エラーハンドリング（50行）
   → 「エラーケースのテストを追加してください」
```

### 3. コンテキストの引き継ぎ

```bash
# セッション間でのコンテキスト共有
「前回実装したProductモデルに基づいて、
在庫管理機能を追加してください。
models/product.tsの構造を維持してください」
```

### 4. フィードバックループ

```
小実装 → テスト → 問題発見 → 即修正 → 次の小実装
```

### 5. テンプレートのカスタマイズ

プロジェクトに合わせてテンプレートをカスタマイズ：

```bash
# 独自テンプレートを追加
cp my-template.md ClaudeFlow/tasks/
```

## 🛠️ 高度な使い方

### コンテキスト最適化テクニック

#### 1. モジュール単位での開発

```bash
# モジュールごとに独立した開発
Module A (認証) → 完全にテスト → Module B (商品管理) → 完全にテスト

# 各モジュールは独立してテスト可能
```

#### 2. インターフェース定義先行

```typescript
// 最初にインターフェースを定義
interface ProductService {
  create(data: ProductDTO): Promise<Product>
  findById(id: string): Promise<Product>
}

// その後、実装を段階的に追加
```

#### 3. コンテキスト履歴の管理

```bash
# 実装履歴をドキュメント化
echo "## 2024-01-10: ProductモデルCRUD実装完了" >> implementation-log.md
echo "- ファイル: models/product.ts, services/product.ts" >> implementation-log.md
echo "- テスト: tests/product.test.ts (12 tests passing)" >> implementation-log.md
```

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

### コンテキストウィンドウ関連の問題

#### 症状：Claude Codeが途中で混乱する
```bash
# 問題のある例
「すべての機能を一度に実装してください：
認証、商品管理、カート、決済、配送追跡、レビュー機能...」

# 解決策
「まず認証機能のみを実装してください」
→ テスト
「次に商品管理機能を追加してください」
```

#### 症状：前の実装を忘れてしまう
```bash
# 解決策1: 明示的な参照
「先ほど実装したUserモデル（models/user.ts）と同じパターンで
ProductモデルをimplementしてくださいId」

# 解決策2: コンテキストの要約
「これまでに実装済み：
- User認証（JWT使用）
- 商品CRUD API
次はカート機能を追加してください」
```

### Claude Codeが計画を理解できない場合

1. **タスクの粒度を確認**
   - 1タスク = 1つの明確な成果物
   - 50-200行程度の実装単位

2. **依存関係を明示**
   ```
   「ProductモデルにカテゴリーD機能を追加
   注意: 既存のCRUD APIとの互換性を維持」
   ```

3. **成功基準を定義**
   ```
   「実装後、以下のテストが通ること：
   - 商品の作成/取得/更新/削除
   - カテゴリーでのフィルタリング」
   ```

### 生成されたコードが期待と異なる場合

1. **小さく始める**
   - 最小限の機能から開始
   - 動作確認後に機能追加

2. **パターンの確立**
   - 最初の実装でパターンを確立
   - 後続の実装で同じパターンを指定

3. **段階的な複雑性**
   - Simple → Basic → Advanced
   - 各段階でテストとレビュー

## 📚 さらに詳しく

- [英語版README](../README.md)
- [開発フローチャート](./DEVELOPMENT-FLOW.md)
- [設定ファイルについて](../CLAUDE.md)
- [テンプレート一覧](../ClaudeFlow/tasks/)

## 🤝 サポート

問題や質問がある場合：
- GitHubでIssueを作成
- より良いテンプレートの提案
- Claude Codeとの連携改善アイデア

---

ClaudeFlowとClaude Codeを組み合わせることで、より効率的で体系的な開発が可能になります。