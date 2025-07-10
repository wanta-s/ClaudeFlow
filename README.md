# ClaudeFlow (CF)

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/wanta-s/ClaudeFlow/blob/main/CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**ClaudeFlow** は、Claude Code向けのAI開発ワークフローツールです。コンテキストエンジニアリングを活用した開発支援を提供します。

## インストール

### Claude Codeでの使用方法

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


## 含まれるツール

### ClaudeFlow (CF) Components
- **commands/** - MCPコマンド定義
- **shared/** - 共有設定とルール
- **CLAUDE.md** - ClaudeFlow設定ファイル

### AI開発ワークフロー
- **ClaudeFlow/** - AI開発自動化スクリプト
- **test-driven-development/** - TDD手法
- **minimal-impact-implementation/** - 最小影響実装
- **change-impact-testing/** - 変更影響テスト

## アップデート

### JavaScript版（推奨）
```bash
node scripts/install-mcp-tools.js --update
```

### ワンライナーアップデート

**Unix/Linux/Mac:**
```bash
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/scripts/update.sh | bash
```


アップデート時の動作：
- 現在の設定をバックアップ（~/.claude-backup）
- 最新版をダウンロード
- エラー時はバックアップから復元

## アンインストール

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
curl -fsSL https://raw.githubusercontent.com/wanta-s/ClaudeFlow/main/scripts/uninstall.sh | bash
```


## 手動インストール

1. このリポジトリをクローン
2. `~/.claude/` ディレクトリを作成
3. 必要なファイルをコピー：
```bash
cp -r commands shared CLAUDE.md ~/.claude/
```

## プロジェクト構成

```
ClaudeFlow/
├── README.md                # このファイル
├── CLAUDE.md               # ClaudeFlow設定ファイル
├── package.json            # npm設定
├── scripts/                # インストール・管理スクリプト
│   ├── install-mcp-tools.js   # メインインストーラー
│   ├── install.sh             # ワンライナー用
│   ├── update.sh              # アップデート用
│   └── uninstall.sh           # アンインストール用
├── commands/               # MCPコマンド定義
├── shared/                 # 共有設定とルール
├── docs/                   # ドキュメント
│   ├── USAGE-JP.md           # 日本語使い方ガイド
│   └── ...                   # その他のドキュメント
└── ClaudeFlow/             # AI開発ワークフロー
    ├── scripts/            # 自動化スクリプト
    ├── tasks/              # タスクテンプレート
    └── templates/          # 各種テンプレート
```

## ドキュメント

- [日本語使い方ガイド](./docs/USAGE-JP.md)
- [ClaudeFlow設定ガイド](./CLAUDE.md)
- [AI開発フロー](./ClaudeFlow/README.md)

## 貢献

プルリクエストを歓迎します！

## ライセンス

MIT License