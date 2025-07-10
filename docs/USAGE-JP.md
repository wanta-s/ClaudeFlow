# 🚀 ClaudeFlow 使い方ガイド

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)

## 📋 概要

このツールは、Claude Code向けの設定ファイルとプロジェクトテンプレートを提供します。開発計画やタスク管理用のMarkdownテンプレートを生成し、プロジェクトの構造化を支援します。

**現在のバージョン**: v2.0.0 | [変更履歴](../CHANGELOG.md)

## 🚨 重要な注意事項

ClaudeFlowは以下の機能を**提供しません**：
- ❌ 自動的なAI開発機能
- ❌ Claude Codeとの直接的な統合
- ❌ 自動コード生成
- ❌ トークン最適化
- ❌ 思考モードの拡張

ClaudeFlowが実際に**提供する**機能：
- ✅ 設定ファイルのインストール（~/.claude/ディレクトリへ）
- ✅ プロジェクト計画用のMarkdownテンプレート
- ✅ タスク管理テンプレート
- ✅ プロジェクト構造の提案

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

以下のファイルがインストールされます：
- `CLAUDE.md` - 基本的な設定ファイル
- `commands/` - 空のディレクトリ（将来の拡張用）
- `shared/` - 空のディレクトリ（将来の拡張用）

## 🎯 実際の使い方

### 1. Markdownテンプレートの生成

ClaudeFlowの主な機能は、プロジェクト計画用のテンプレート生成です：

```bash
# ClaudeFlowディレクトリに移動
cd ClaudeFlow/scripts

# プロジェクトテンプレートを生成
./start.sh
```

スクリプトは以下を行います：
1. プロジェクト名や説明を対話的に入力
2. 入力内容に基づいてMarkdownテンプレートを生成
3. results/ディレクトリにファイルを保存

### 2. 生成されるテンプレート

#### プロジェクト計画テンプレート
```markdown
# プロジェクト名

## 概要
[プロジェクトの説明]

## タスクリスト
- [ ] タスク1
- [ ] タスク2
```

### 3. テンプレートの活用方法

生成されたテンプレートは手動で編集して使用します：
1. 生成されたMarkdownファイルを開く
2. プレースホルダーを実際の内容に置き換える
3. プロジェクトのドキュメントとして活用

## 📁 プロジェクト構造

ClaudeFlowをインストールすると、以下の構造が作成されます：

```
~/.claude/
├── CLAUDE.md       # 基本設定ファイル
├── commands/       # 空のディレクトリ
└── shared/         # 空のディレクトリ

ClaudeFlow/
├── scripts/        # テンプレート生成スクリプト
├── tasks/          # テンプレートファイル
└── results/        # 生成されたファイルの保存先
```

## 💡 具体的な使用例

### 例1: 新規プロジェクトの計画

```bash
cd ClaudeFlow/scripts
./start.sh

# 対話的な入力:
# Project name: MyNewApp
# Project description: A todo list application
# ...

# 結果: results/にプロジェクト計画のMarkdownファイルが生成される
```

### 例2: 既存テンプレートの利用

```bash
# テンプレートをコピーして編集
cp ClaudeFlow/tasks/01_planning.md my-project-plan.md
# エディタで開いて編集
```

## ⚠️ 制限事項と期待値管理

### 期待しないでください：
- Claude Codeが自動的に賢くなることはありません
- AIが自動的にコードを生成することはありません
- 複雑なタスクが自動化されることはありません

### 実際の効果：
- プロジェクトの構造化に役立つテンプレートを提供
- 開発計画の文書化を支援
- 標準的なプロジェクト構造の提案

## 🎨 カスタマイズ

### テンプレートの編集

```bash
# テンプレートファイルを直接編集
nano ClaudeFlow/tasks/01_planning.md

# 独自のテンプレートを追加
cp my-template.md ClaudeFlow/tasks/
```

### スクリプトの修正

生成スクリプトはシンプルなbashスクリプトなので、必要に応じて編集できます：

```bash
# スクリプトを編集
nano ClaudeFlow/scripts/start.sh
```

## 🆘 トラブルシューティング

### インストールがうまくいかない
```bash
# 手動インストール
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ClaudeFlow
node scripts/install-mcp-tools.js
```

### テンプレートが生成されない
```bash
# 権限を確認
chmod +x ClaudeFlow/scripts/*.sh

# 手動で実行
bash ClaudeFlow/scripts/start.sh
```

### ファイルが見つからない
```bash
# インストール状況を確認
ls -la ~/.claude/

# 再インストール
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/install.sh | bash
```

## 📚 さらに詳しく

- [英語版README](../README.md)
- [設定ファイルについて](../CLAUDE.md)
- [開発テンプレート](../docs/)

## 🤝 サポート

問題や質問がある場合：
- GitHubでIssueを作成
- プルリクエストで改善提案

特に以下の貢献を歓迎します：
- 実際に動作する機能の実装
- より実用的なテンプレートの追加
- ドキュメントの改善

---

ClaudeFlowの設定が完了しました。