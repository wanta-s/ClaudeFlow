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
node scripts/install-mcp-tools.js
```

**シェルスクリプト版（Unix/Linux/Mac）:**
```bash
chmod +x install-mcp-tools.sh
./scripts/install-mcp-tools.sh
```

**PowerShell版（Windows）:**
```powershell
.\scripts\install-mcp-tools.ps1
```

## 📦 ワンライナーインストール

### npm/npx を使用（Node.jsが必要）
```bash
npx github:wanta-s/ai-first-context-engineering
```

### curl を使用（Unix/Linux/Mac）
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/install.sh | bash
```

### PowerShell を使用（Windows）
```powershell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/install.ps1 | iex
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

## 🔄 アップデート

### JavaScript版（推奨）
```bash
node scripts/install-mcp-tools.js --update
```

### ワンライナーアップデート

**Unix/Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/update.sh | bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/update.ps1 | iex
```

アップデート時の特徴：
- 🔐 現在の設定を自動バックアップ（~/.claude-backup）
- 📦 最新版を自動ダウンロード
- ✅ エラー時は自動的にバックアップから復元

## 🗑️ アンインストール

### JavaScript版（推奨）
```bash
node scripts/install-mcp-tools.js --uninstall
```

### シェルスクリプト版（Unix/Linux/Mac）
```bash
./scripts/uninstall.sh
```

### PowerShell版（Windows）
```powershell
.\scripts\uninstall.ps1
```

### ワンライナーアンインストール

**Unix/Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/uninstall.sh | bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/uninstall.ps1 | iex
```

## 🔧 手動インストール

1. このリポジトリをクローン
2. `~/.claude/` ディレクトリを作成
3. 必要なファイルをコピー：
```bash
cp -r commands shared CLAUDE.md ~/.claude/
```

## 📁 プロジェクト構成

```
ai-first-context-engineering/
├── README.md                # このファイル
├── package.json            # npm設定
├── scripts/                # インストール・管理スクリプト
│   ├── install-mcp-tools.js   # メインインストーラー
│   ├── install.sh/ps1         # ワンライナー用
│   ├── update.sh/ps1          # アップデート用
│   └── uninstall.sh/ps1       # アンインストール用
├── docs/                   # ドキュメント
│   ├── USAGE-JP.md           # 日本語使い方ガイド
│   └── ...                   # その他のドキュメント
└── ai-development-flow/    # AI開発ワークフロー
```

## 📖 ドキュメント

- [日本語使い方ガイド](./docs/USAGE-JP.md) 🆕
- [SuperClaude設定ガイド](./CLAUDE.md)
- [AI開発フロー](./ai-development-flow/)

## 🤝 貢献

プルリクエストを歓迎します！

## 📄 ライセンス

MIT License