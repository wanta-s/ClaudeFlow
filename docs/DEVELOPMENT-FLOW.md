# ClaudeFlow アプリケーション開発フローチャート

## 📊 開発プロセス全体図

```mermaid
graph TD
    Start([ユーザー開始]) --> Entry{エントリーポイント選択}
    
    Entry -->|簡単| QuickStart[quick-start.sh<br/>30秒設定]
    Entry -->|詳細| Interactive[interactive-planning.sh<br/>3-5分の対話]
    Entry -->|自動| Auto[start.sh --auto<br/>10秒で開始]
    
    QuickStart --> UserInput[00_user_input.md<br/>生成]
    Interactive --> UserInput
    Auto --> UserInput
    
    UserInput --> Analyze[analyze-and-generate.sh<br/>プロジェクト分析]
    
    Analyze --> ComplexityCheck{複雑度判定}
    ComplexityCheck -->|シンプル| Template[generate-tasks.sh<br/>テンプレートベース]
    ComplexityCheck -->|複雑/カスタム| Dynamic[generate-dynamic-tasks.sh<br/>動的生成]
    
    Template --> Tasks[9つのタスクファイル生成]
    Dynamic --> Tasks
    
    Tasks --> Pipeline[run-pipeline.sh<br/>パイプライン実行]
    
    Pipeline --> Phase1[フェーズ1: 計画<br/>01_planning.md]
    Phase1 --> Phase2[フェーズ2: 調査<br/>02_research.md]
    Phase2 --> Phase3[フェーズ3: 要件定義<br/>03_requirements.md]
    Phase3 --> Phase4[フェーズ4: プロトタイプ<br/>04_prototype.md]
    Phase4 --> Phase5[フェーズ5: 設計<br/>05_design.md]
    Phase5 --> Phase6[フェーズ6: 実装<br/>context-driven-implementation.sh]
    Phase6 --> Phase7[フェーズ7: テスト<br/>07_testing.md]
    
    Phase7 --> Phase8[フェーズ8: コードレビュー<br/>08_code_review.md]
    Phase8 --> Phase9[フェーズ9: ドキュメント<br/>09_documentation.md]
    Phase9 --> Complete([開発完了])
```

## 🚀 詳細な開発フロー

### 1. スタートアップフェーズ

#### 1.1 エントリーポイント（3つの選択肢）

```
┌─────────────────────────────────────────────────────┐
│ ClaudeFlowを開始する方法を選択してください：          │
├─────────────────────────────────────────────────────┤
│ 1. quick-start.sh    - 最速（30秒）               │
│    └→ アプリ名だけ入力、他はデフォルト値            │
│                                                    │
│ 2. interactive-planning.sh - 詳細（3-5分）         │
│    └→ 対話形式で要件を詳細に定義                   │
│                                                    │
│ 3. start.sh --auto   - 全自動（10秒）             │
│    └→ サンプルプロジェクトで即開始                  │
└─────────────────────────────────────────────────────┘
```

#### 1.2 ユーザー入力収集

**対話形式の質問内容：**
- プロジェクト名と説明
- ターゲットユーザー
- 必要な機能リスト
- 使用デバイス（PC/スマホ/タブレット）
- デザインの優先順位
- セキュリティ要件
- 開発期限

**出力：** `results/00_user_input.md`

### 2. 分析・生成フェーズ

#### 2.1 プロジェクト分析（analyze-and-generate.sh）

```
Claude による分析：
┌─────────────────────────────┐
│ 入力された要件を分析中...      │
├─────────────────────────────┤
│ ✓ アプリタイプ: ECサイト      │
│ ✓ 複雑度: 標準               │
│ ✓ 特殊要件: 決済システム      │
│ ✓ 推奨アプローチ: 動的生成    │
└─────────────────────────────┘
```

#### 2.2 タスク生成

**テンプレートベース（generate-tasks.sh）：**
- 標準的な9つのタスクテンプレートを使用
- ユーザー入力に基づいてカスタマイズ

**動的生成（generate-dynamic-tasks.sh）：**
- Claude がプロジェクトに最適化されたタスクを生成
- 特殊要件に対応したカスタムタスク

### 3. パイプライン実行フェーズ

#### フェーズ1: プロジェクト計画（01_planning.md）

```
入力: 00_user_input.md
↓
Claude が生成:
- 技術スタックの選定
- MVP機能の定義
- 開発アプローチの決定
- リスク評価
↓
出力: 01_planning_result.md
```

#### フェーズ2: 技術調査（02_research.md）

```
入力: 01_planning_result.md + 00_user_input.md
↓
Claude が生成:
- ライブラリ選定と理由
- セキュリティ実装方針
- 開発環境構築手順
- プロジェクト構造提案
↓
出力: 02_research_result.md
```

#### フェーズ3: 要件定義（03_requirements.md）

```
入力: 02_research_result.md + 01_planning_result.md
↓
Claude が生成:
- 機能仕様書
- データベース設計（ER図）
- API エンドポイント定義
- 画面遷移図
↓
出力: 03_requirements_result.md
```

#### フェーズ4: プロトタイプ（04_prototype.md）

```
入力: 03_requirements_result.md
↓
Claude が生成:
- 基本機能の実装コード
- 動作確認可能なプロトタイプ
↓
出力: 04_prototype_result.md
```

#### フェーズ5: 詳細設計（05_design.md）

```
入力: 03_requirements_result.md + 04_prototype_result.md
↓
Claude が生成:
- アーキテクチャ設計
- モジュール構成
- データフロー図
↓
出力: 05_design_result.md
```

#### フェーズ6: 実装（コンテキストエンジニアリング）

##### コンテキストエンジニアリング実装

ClaudeFlowは高品質なコード生成のためにコンテキストエンジニアリング実装を採用しています：

```
各機能に対して以下のステップを実行：

1. 機能仕様生成
   └→ 詳細な型定義とインターフェース

2. 最小実装
   └→ 仕様に基づく最小限のコード

3. リファクタリング
   └→ コード量を30%削減、パターン抽出

4. テスト作成・実行
   └→ 単体テストの生成と実行

5. 最適化
   └→ パフォーマンスチューニング

6. API仕様生成
   └→ OpenAPI 3.0 ドキュメント

7. パターンライブラリ更新
   └→ 次の機能で再利用可能
```

**利点**：
- 高品質なコード（CEプロセス）
- パターンの蓄積と再利用
- コードの再利用性を最大化
- 保守性の高い実装

#### フェーズ7-9: テスト、レビュー、ドキュメント

```
フェーズ7（テスト）:
- 包括的なテストスイート生成
- 単体テスト、統合テスト、E2Eテスト

フェーズ8（コードレビュー）:
- コード品質チェック
- 改善提案
- セキュリティ監査

フェーズ9（ドキュメント）:
- ユーザーマニュアル
- API ドキュメント
- デプロイメントガイド
```

### 4. 生成されるファイル構造

```
ClaudeFlow/
├── results/                      # 各フェーズの出力
│   ├── 00_user_input.md         # ユーザー要件
│   ├── 01_planning_result.md    # 計画書
│   ├── 02_research_result.md    # 技術調査
│   ├── 03_requirements_result.md # 要件定義
│   ├── 04_prototype_result.md   # プロトタイプ
│   ├── 05_design_result.md      # 設計書
│   ├── 06_implementation_result.md # 実装結果
│   ├── 07_testing_result.md     # テスト結果
│   ├── 08_code_review_result.md # レビュー結果
│   └── 09_documentation_result.md # ドキュメント
│
├── implementation/              # 生成されたコード
│   ├── feature_auth/           # 認証機能
│   ├── feature_product/        # 商品管理機能
│   ├── auth_spec.md           # 認証機能仕様
│   ├── auth_api.yaml          # 認証API仕様
│   └── api_summary.yaml       # 統合API仕様
│
├── tests/                      # テストファイル
│   ├── unit/                  # 単体テスト
│   ├── integration/           # 統合テスト
│   └── e2e/                   # E2Eテスト
│
└── .context/                   # コンテキスト管理
    ├── CONTEXT.md             # コーディング原則
    ├── PATTERNS.md            # 再利用可能パターン
    └── code_metrics.log       # コード metrics
```

### 5. フィードバックループ

```
┌─────────────────────────────────────────┐
│         継続的なフィードバック            │
├─────────────────────────────────────────┤
│                                        │
│  計画 → 実装 → テスト → レビュー        │
│    ↑                      ↓           │
│    └──────── 問題発見 ←────┘           │
│                                        │
│  各フェーズで：                         │
│  ✓ Claude が前フェーズの結果を参照      │
│  ✓ ユーザーが結果をレビュー可能         │
│  ✓ 必要に応じて修正・再実行            │
│                                        │
└─────────────────────────────────────────┘
```

### 6. コンテキストウィンドウの管理

```
小さな単位での実装：
┌────────────┐  ┌────────────┐  ┌────────────┐
│ 機能A      │  │ 機能B      │  │ 機能C      │
│ (100行)    │→ │ (150行)    │→ │ (80行)     │
│ ✓テスト済   │  │ ✓テスト済   │  │ ✓テスト済   │
└────────────┘  └────────────┘  └────────────┘
       ↓               ↓               ↓
       └───────────────┴───────────────┘
                      ↓
              統合されたシステム
              （各部品は独立して動作確認済み）
```

## 🎯 成功のポイント

1. **段階的な実装**: 各フェーズが明確に分離され、前の結果を次に活用
2. **テストの統合**: 実装と同時にテストを作成・実行
3. **コンテキスト管理**: 小さな単位で作業し、Claude の制限内で効率的に動作
4. **柔軟な実装モード**: プロジェクトに応じて最適な実装方法を選択
5. **完全な自動化**: ユーザー入力後は全自動で進行可能

このフローに従うことで、ClaudeFlow は Claude Code の能力を最大限に活用し、高品質なアプリケーションを効率的に開発できます。