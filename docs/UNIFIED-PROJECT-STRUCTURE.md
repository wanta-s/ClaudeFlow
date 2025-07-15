# 統一プロジェクト構造システム

## 概要

ClaudeFlowの統一プロジェクト構造システムは、すべての実装スクリプトが一貫したプロジェクト構造でアプリケーションを生成することを保証します。

## 🔧 対応済み実装スクリプト

- ✅ `context-driven-implementation.sh` - コンテキストエンジニアリング実装
- ✅ `incremental-implementation.sh` - インクリメンタル実装  
- ✅ `auto-incremental-implementation.sh` - 自動インクリメンタル実装
- ✅ `hybrid-implementation.sh` - ハイブリッド実装
- ✅ `simple-auto-impl.sh` - 簡易自動実装

## 主要機能

### 1. 自動プロジェクト名決定

要件ファイルの内容から自動的にプロジェクト名を決定します：

```bash
# 例：ToDoアプリの場合
# 生成されるプロジェクト名: "todo-app"
```

### 2. プロジェクトタイプ自動判定

要件内容から最適なプロジェクトタイプを判定：

- **web**: フロントエンド（React/Next.js等）
- **backend**: サーバーサイド（API/データベース）
- **fullstack**: フルスタック（フロント+バック）
- **cli**: コマンドラインツール
- **library**: ライブラリ/パッケージ

### 3. 統一ディレクトリ構造

すべてのプロジェクトタイプで一貫した構造を提供：

```
generated-project/
├── src/                 # メインソースコード
│   ├── components/      # UIコンポーネント
│   ├── hooks/          # カスタムフック
│   ├── pages/          # ページコンポーネント
│   ├── services/       # ビジネスロジック
│   ├── styles/         # スタイル
│   ├── types/          # TypeScript型定義
│   └── utils/          # ユーティリティ
├── tests/              # テストコード
│   ├── unit/          # 単体テスト
│   ├── integration/   # 統合テスト
│   └── e2e/           # E2Eテスト
├── config/            # 設定ファイル
├── docs/              # ドキュメント
├── public/            # 静的ファイル
├── scripts/           # ビルドスクリプト
├── assets/            # アセット
└── PROJECT_INFO.md    # プロジェクト情報
```

## 実装詳細

### common-functions.sh の新機能

#### 主要関数

1. **`create_unified_project()`**
   - 要件ファイルからプロジェクト作成
   - プロジェクト名とタイプの自動決定
   - ディレクトリ構造の作成

2. **`extract_project_name()`**
   - 要件内容からプロジェクト名を抽出
   - キーワードベースの判定
   - デフォルト名へのフォールバック

3. **`determine_project_type()`**
   - 要件内容からプロジェクトタイプを判定
   - 技術スタックの分析
   - 適切なタイプの選択

4. **`create_project_structure()`**
   - タイプ別のディレクトリ構造作成
   - PROJECT_INFO.mdの生成
   - ログ出力

### 使用方法

各実装スクリプトでの統一された使用方法：

```bash
# 要件ファイルを特定
REQUIREMENTS_FILE="path/to/requirements.md"

# 統一プロジェクト構造を作成
if [ -f "$REQUIREMENTS_FILE" ]; then
    PROJECT_DIR=$(create_unified_project "$REQUIREMENTS_FILE" "$BASE_IMPLEMENTATION_DIR")
    IMPLEMENTATION_DIR="$PROJECT_DIR/src"
    log_info "統一プロジェクト構造で実行: $PROJECT_DIR"
else
    # 従来の方式をフォールバック
    mkdir -p "$BASE_IMPLEMENTATION_DIR"
    IMPLEMENTATION_DIR="$BASE_IMPLEMENTATION_DIR"
    log_warning "要件ファイルが見つかりません。従来の構造を使用します。"
fi
```

## 生成される情報

### PROJECT_INFO.md

各プロジェクトに自動生成される情報ファイル：

```markdown
# project-name

## プロジェクト情報
- **プロジェクト名**: project-name
- **タイプ**: web
- **作成日**: 2025-07-15 09:30:44
- **作成ツール**: ClaudeFlow

## ディレクトリ構造
[自動生成されたディレクトリ一覧]

## 開発メモ
このプロジェクトはClaudeFlowによって自動生成されました。
実装コードは `src/` ディレクトリに配置されています。
```

## 利点

### 1. 一貫性の確保
- すべての実装方式で同じ構造
- 開発者の混乱を防止
- チーム開発での統一性

### 2. 保守性の向上
- 標準化されたディレクトリ配置
- 予測可能なファイル場所
- 簡単なナビゲーション

### 3. 自動化の促進
- プロジェクト名とタイプの自動決定
- 手動設定の削減
- エラーの防止

### 4. 拡張性
- 新しいプロジェクトタイプの追加が容易
- 既存スクリプトへの影響なし
- 段階的な機能追加

## 従来構造との互換性

要件ファイルが見つからない場合は、自動的に従来の構造にフォールバック：

```bash
# 従来の方式
mkdir -p "$BASE_IMPLEMENTATION_DIR"
IMPLEMENTATION_DIR="$BASE_IMPLEMENTATION_DIR"
log_warning "要件ファイルが見つかりません。従来の構造を使用します。"
```

これにより、既存のワークフローを壊すことなく新機能を導入できます。

## テスト結果

統一プロジェクト構造の動作確認：

```bash
$ find /path/to/generated-app -type d
/path/to/generated-app
/path/to/generated-app/src
/path/to/generated-app/src/components
/path/to/generated-app/src/hooks
/path/to/generated-app/src/pages
/path/to/generated-app/src/services
/path/to/generated-app/src/styles
/path/to/generated-app/src/types
/path/to/generated-app/src/utils
/path/to/generated-app/tests
/path/to/generated-app/tests/unit
/path/to/generated-app/tests/integration
/path/to/generated-app/tests/e2e
/path/to/generated-app/config
/path/to/generated-app/docs
/path/to/generated-app/public
/path/to/generated-app/scripts
/path/to/generated-app/assets
```

✅ **すべての実装スクリプトで統一プロジェクト構造が正常に動作することを確認済み**