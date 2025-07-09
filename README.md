# ClaudeFlow (CF)

**ClaudeFlow** は、Claude Codeを強化するAI開発ワークフローツールです。AIファーストのコンテキストエンジニアリング手法を用いて、効率的な開発環境を提供します。

## 🚀 クイックインストール

### Claude Codeでの使用方法

1. **リポジトリをクローン**
```bash
git clone https://github.com/wanta-s/ClaudeFlow.git
cd ai-first-context-engineering
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


## 📦 ワンライナーインストール

### npm/npx を使用（Node.jsが必要）
```bash
npx github:wanta-s/ai-first-context-engineering
```

### curl を使用（Unix/Linux/Mac）
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/install.sh | bash
```


## 📚 含まれるツール

### ClaudeFlow (CF) Components
- **commands/** - 様々なMCPコマンド定義
- **shared/** - 共有設定とルール
- **CLAUDE.md** - ClaudeFlow設定ファイル

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


### ワンライナーアンインストール

**Unix/Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ai-first-context-engineering/main/scripts/uninstall.sh | bash
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
- [ClaudeFlow設定ガイド](./CLAUDE.md)
- [AI開発フロー](./ai-development-flow/)

## 🤝 貢献

プルリクエストを歓迎します！

## 📄 ライセンス

MIT License