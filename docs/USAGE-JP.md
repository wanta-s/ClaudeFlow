# 🚀 AI-First Context Engineering 使い方ガイド

## 📋 概要

このツールは、Claude Codeを最強にパワーアップさせる「SuperClaude」の設定と、AI開発ワークフローを提供します。

## 🔧 インストール方法

### 1. 最速インストール（推奨）

```bash
# Unix/Linux/Mac
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/install.sh | bash

# Windows PowerShell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/install.ps1 | iex
```

### 2. インストール後の確認

```bash
# インストールされたファイルを確認
ls ~/.claude/
```

以下のファイルがインストールされます：
- `CLAUDE.md` - SuperClaudeのメイン設定
- `commands/` - 各種コマンド定義
- `shared/` - 共有設定とルール

## 🎯 使い方

### 1. SuperClaude機能の活用

インストール後、Claude Codeは自動的に以下の機能を使えるようになります：

#### 🧠 思考モード
```
# 複雑な問題を解決する時
"この問題を段階的に考えて解決してください"
→ ClaudeがIntrospectionモードで深く思考します
```

#### 🗜️ 圧縮モード
```
# トークンを節約したい時
"UltraCompressedモードで説明してください"
→ 超圧縮された効率的な回答
```

#### 📊 タスク管理
```
# 複雑なプロジェクト
"新しいWebアプリを作成してください"
→ 自動的にTodoリストを作成して進行状況を管理
```

### 2. AI開発ワークフローの使用

#### 📁 プロジェクト構造
```
ai-first-context-engineering/
├── ai-development-flow/        # AI開発フロー
├── test-driven-development/    # TDD手法
├── minimal-impact-implementation/  # 最小影響実装
└── change-impact-testing/      # 変更影響テスト
```

#### 🔄 開発フローの例

1. **TDD（テスト駆動開発）**
```bash
# テストファーストで開発
"test-driven-developmentの手法で新機能を実装してください"
```

2. **最小影響実装**
```bash
# 既存コードへの影響を最小限に
"minimal-impact-implementationで機能を追加してください"
```

3. **変更影響テスト**
```bash
# 変更の影響を事前に確認
"change-impact-testingで変更の影響を調べてください"
```

## 💡 具体的な使用例

### 例1: Webアプリ開発
```
User: "ReactとTypeScriptで簡単なTodoアプリを作ってください"

Claude: [SuperClaudeが自動的に以下を実行]
1. プロジェクト構造を計画（Todoリスト作成）
2. 必要なファイルを効率的に生成
3. テストコードも同時に作成
4. 進捗を可視化
```

### 例2: バグ修正
```
User: "このエラーを修正してください: [エラーメッセージ]"

Claude: [SuperClaudeが自動的に以下を実行]
1. エラーの原因を段階的に分析（Analyzerペルソナ）
2. 最小限の変更で修正（minimal-impact）
3. 修正の影響範囲を確認
4. テストで動作確認
```

### 例3: コードレビュー
```
User: "このコードをレビューしてください"

Claude: [SuperClaudeが自動的に以下を実行]
1. セキュリティチェック（OWASP Top 10）
2. パフォーマンス分析
3. ベストプラクティスとの比較
4. 改善提案を優先度付きで提示
```

## 🎨 カスタマイズ

### CLAUDE.mdの編集
```bash
# 設定ファイルを開く
nano ~/.claude/CLAUDE.md

# 自分好みにカスタマイズ
# 例: デフォルトの圧縮レベルを変更
```

### 新しいコマンドの追加
```bash
# commandsディレクトリに新しいYAMLファイルを追加
~/.claude/commands/my-custom-command.yml
```

## ⚡ プロのヒント

1. **トークン節約**
   - 長い会話では`UltraCompressed`モードを活用
   - 定期的に要約を依頼

2. **効率的な開発**
   - 複雑なタスクは必ずTodoリストを使用
   - テストファーストで品質確保

3. **セキュリティ**
   - 自動的にOWASP Top 10をチェック
   - 機密情報の取り扱いに注意

## 🆘 トラブルシューティング

### インストールがうまくいかない
```bash
# 手動インストール
git clone https://github.com/wanta-s/ai-first-context-engineering.git
cd ai-first-context-engineering
node install-mcp-tools.js
```

### 機能が動作しない
```bash
# 設定を確認
cat ~/.claude/CLAUDE.md

# 再インストール
node install-mcp-tools.js --uninstall
node install-mcp-tools.js
```

## 📚 さらに詳しく

- [英語版README](./README.md)
- [SuperClaude詳細設定](./CLAUDE.md)
- [開発者向けドキュメント](./docs/)

## 🤝 サポート

問題や質問がある場合：
- GitHubでIssueを作成
- プルリクエストで改善提案

---

🎉 **これでClaude Codeが超強力なAI開発アシスタントに変身しました！**