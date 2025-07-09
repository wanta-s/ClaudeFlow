# AI-First Context Engineering

SuperClaude MCP Tools と AI開発ワークフローのインストーラーとドキュメントです。

## 🚀 クイックインストール

### Claude Codeでの使用方法

1. **リポジトリをクローン**
```bash
git clone https://github.com/wanta-s/ai-first-context-engineering.git
cd ai-first-context-engineering
```

2. **インストールスクリプトを実行**

**JavaScript版（推奨）:**
```bash
node install-mcp-tools.js
```

**シェルスクリプト版（Unix/Linux/Mac）:**
```bash
chmod +x install-mcp-tools.sh
./install-mcp-tools.sh
```

**PowerShell版（Windows）:**
```powershell
.\install-mcp-tools.ps1
```

## 📦 ワンライナーインストール

### npm/npx を使用（Node.jsが必要）
```bash
npx github:wanta-s/ai-first-context-engineering
```

### curl を使用（Unix/Linux/Mac）
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/install.sh | bash
```

### PowerShell を使用（Windows）
```powershell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/install.ps1 | iex
```

## 📚 含まれるツール

### SuperClaude MCP Tools
- **commands/** - 様々なMCPコマンド
- **shared/** - 共有設定とルール
- **CLAUDE.md** - SuperClaude設定ファイル

### AI開発ワークフロー
- **ai-development-flow/** - AI開発自動化スクリプト
- **test-driven-development/** - TDD手法
- **minimal-impact-implementation/** - 最小影響実装
- **change-impact-testing/** - 変更影響テスト

## 🗑️ アンインストール

### JavaScript版（推奨）
```bash
node install-mcp-tools.js --uninstall
```

### シェルスクリプト版（Unix/Linux/Mac）
```bash
./uninstall.sh
```

### PowerShell版（Windows）
```powershell
.\uninstall.ps1
```

### ワンライナーアンインストール

**Unix/Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/uninstall.sh | bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/uninstall.ps1 | iex
```

## 🔧 手動インストール

1. このリポジトリをクローン
2. `~/.claude/` ディレクトリを作成
3. 必要なファイルをコピー：
```bash
cp -r commands shared CLAUDE.md ~/.claude/
```

## 📖 ドキュメント

- [SuperClaude設定ガイド](./CLAUDE.md)
- [AI開発フロー](./ai-development-flow/)
- [日本語ドキュメント](./japanese-documentation/)

## 🤝 貢献

プルリクエストを歓迎します！

## 📄 ライセンス

MIT License