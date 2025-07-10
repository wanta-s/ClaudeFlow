# ClaudeFlow (CF)

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**ClaudeFlow** は、Claude Code向けの設定ファイルとプロジェクトテンプレートを提供するツールです。開発計画用のMarkdownテンプレートを生成し、プロジェクトの構造化を支援します。

## 実際の機能

ClaudeFlowは以下の機能を提供します：

1. **設定ファイルのインストール** - Claude Codeの設定ディレクトリ（~/.claude/）に設定ファイルをコピーします
2. **Markdownテンプレート生成** - プロジェクト計画、タスク管理、設計ドキュメント用のテンプレートを生成します
3. **プロジェクト構造の提供** - 開発プロジェクトの標準的なディレクトリ構造を提案します

**注意**: このツールは自動的なAI開発機能や、Claude Codeとの直接的な統合機能は提供しません。主にテンプレートとプロジェクト構造の提供に焦点を当てています。

## インストール

### 前提条件
- Node.js（npm/npxコマンド用）
- Unix/Linux/Mac環境（シェルスクリプト用）

### インストール方法

1. **リポジトリをクローン**
```bash
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ClaudeFlow
```

2. **インストールスクリプトを実行**

**JavaScript版（推奨）:**
```bash
node scripts/install-mcp-tools.js
```

**シェルスクリプト版（Unix/Linux/Mac）:**
```bash
chmod +x scripts/install-mcp-tools.sh
./scripts/install-mcp-tools.sh
```

## ワンライナーインストール

### npm/npx を使用（Node.jsが必要）
```bash
npx github:wanta-s/ClaudeFlow
```

### curl を使用（Unix/Linux/Mac）
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/scripts/install.sh | bash
```

## 含まれるコンポーネント

### 設定ファイル
- **CLAUDE.md** - Claude Code用の基本設定ファイル（~/.claude/にコピーされます）
- **commands/** - 将来的な拡張用ディレクトリ（現在は空）
- **shared/** - 将来的な共有設定用ディレクトリ（現在は空）

### テンプレート生成スクリプト
- **ClaudeFlow/scripts/** - Markdownテンプレートを生成するシェルスクリプト
  - `start.sh` - インタラクティブなプロジェクト計画生成
  - `generate-tasks.sh` - タスクテンプレート生成
  - その他の補助スクリプト

### ドキュメントテンプレート
- **ClaudeFlow/tasks/** - プロジェクトフェーズ別のMarkdownテンプレート
  - `01_planning.md` - プロジェクト計画テンプレート
  - `02_research.md` - 調査フェーズテンプレート
  - その他の開発フェーズテンプレート

## 使用方法

### テンプレート生成

ClaudeFlow/scripts/ディレクトリ内のスクリプトを使用して、プロジェクトテンプレートを生成できます：

```bash
cd ClaudeFlow/scripts
./start.sh
```

スクリプトはインタラクティブにプロジェクト情報を入力し、対応するMarkdownテンプレートを生成します。

### 生成されるファイル

テンプレートは入力した情報を元に、以下のような構造のMarkdownファイルを生成します：
- プロジェクト概要
- タスクリスト
- 技術仕様
- 実装計画

## アップデート

```bash
node scripts/install-mcp-tools.js --update
```

## アンインストール

```bash
node scripts/install-mcp-tools.js --uninstall
```

## プロジェクト構成

```
ClaudeFlow/
├── README.md                # このファイル
├── CLAUDE.md               # Claude Code設定ファイル
├── package.json            # npm設定
├── scripts/                # インストール・管理スクリプト
│   ├── install-mcp-tools.js   # メインインストーラー
│   ├── install.sh             # ワンライナー用
│   ├── update.sh              # アップデート用
│   └── uninstall.sh           # アンインストール用
├── commands/               # 将来の拡張用（現在は空）
├── shared/                 # 将来の拡張用（現在は空）
├── docs/                   # ドキュメント
│   ├── USAGE-JP.md           # 日本語使い方ガイド
│   └── ...                   # その他のドキュメント
└── ClaudeFlow/             # テンプレート生成ツール
    ├── scripts/            # テンプレート生成スクリプト
    ├── tasks/              # フェーズ別テンプレート
    └── templates/          # その他のテンプレート
```

## 制限事項

- 実際のAI統合機能はありません
- Claude Codeとの直接的な連携機能はありません
- 生成されるのは静的なMarkdownテンプレートのみです
- 自動的なコード生成機能はありません

## ドキュメント

- [日本語使い方ガイド](./docs/USAGE-JP.md)
- [設定ファイルについて](./CLAUDE.md)

## 貢献

プルリクエストを歓迎します！特に以下の改善を歓迎します：
- 実際に動作する機能の追加
- ドキュメントの改善
- テンプレートの充実

## ライセンス

MIT License