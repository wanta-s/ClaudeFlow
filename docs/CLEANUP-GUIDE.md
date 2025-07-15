# ClaudeFlow クリーンアップガイド

ClaudeFlowで開発されたプロジェクトファイルを安全にクリーンアップする方法を説明します。

## 概要

ClaudeFlowは実行時に以下のファイル・フォルダを生成します：

- `implementation/` - 生成されたコードファイル
- `results/` - 各フェーズの実行結果
- `security/` - 自動生成された認証情報
- `.env*` - 環境変数ファイル
- `.claudeflow_config` - 設定ファイル

## クリーンアップコマンド

### 基本的な使用方法

```bash
# ClaudeFlowディレクトリに移動
cd ClaudeFlow

# 削除対象を確認（実際には削除しない）
./scripts/clean-development.sh --dry-run

# 最小バックアップ付きクリーンアップ（推奨）
./scripts/clean-development.sh --minimal-backup --force

# 完全バックアップを作成してからクリーンアップ
./scripts/clean-development.sh --backup

# 確認なしで即座にクリーンアップ
./scripts/clean-development.sh --force
```

### オプション一覧

| オプション | 短縮形 | 説明 |
|------------|--------|------|
| `--dry-run` | `-n` | 削除対象を表示するのみ（実際には削除しない） |
| `--force` | `-f` | 確認なしで削除を実行 |
| `--backup` | `-b` | 削除前にバックアップを作成 |
| `--minimal-backup` | なし | node_modulesを除外した最小バックアップ（推奨） |
| `--help` | `-h` | ヘルプを表示 |

## 削除対象

### 削除されるもの

**ClaudeFlowフォルダ内:**
- **implementation/** - 生成されたすべてのコードファイル
- **results/** - フェーズ実行結果ファイル
- **security/** - 自動生成認証情報
- **.env*** - 環境変数ファイル
- **.claudeflow_config** - 設定ファイル

**親フォルダレベル:**
- **implementation/** - 完全なアプリケーションプロジェクト
- **results/** - 実行結果とレポート
- **minimal-app/** - Next.jsサンプルアプリ
- **task-management-app/** - タスク管理アプリ（巨大なnode_modules含む）
- **tests/** - テストファイル群
- **一時ファイル** - `*.tmp`, `.temp_*`, `claude_output_*.log`, `*.log`

### 保護されるもの（削除されない）

- **scripts/** - ClaudeFlowスクリプト
- **tasks/** - タスクテンプレート
- **prompts/** - プロンプトテンプレート
- **templates/** - ファイルテンプレート
- **docs/** - ドキュメント
- **.git/** - Gitリポジトリ情報
- **README.md** - プロジェクト説明ファイル

## 実行例

### 1. 安全確認（推奨）

まず、何が削除されるかを確認：

```bash
./scripts/clean-development.sh --dry-run
```

出力例：
```
=== 削除対象の確認 ===
ClaudeFlowフォルダ内:

親フォルダレベル:
  📁 implementation/ (17 ファイル, 84K)
  📁 results/ (5 ファイル, 56K)
  📁 minimal-app/ (13 ファイル, 40K)
  📁 task-management-app/ (8310 ファイル, 155M)
  📁 tests/ (12 ファイル, 120K)

合計: 8357 ファイル, 142MB
========================
DRY RUN モード: 実際の削除は行いません
```

### 2. 最小バックアップ付きクリーンアップ（推奨）

重要なファイルだけを保護して効率的にクリーンアップ：

```bash
./scripts/clean-development.sh --minimal-backup --force
```

**最小バックアップの特徴:**
- node_modulesやpackage-lock.jsonを除外
- 重要なソースコードとドキュメントのみ保護
- バックアップサイズ: 数百KB（元ファイル142MBに対して）

### 3. 完全バックアップ付きクリーンアップ

すべてのファイルを保護したい場合：

```bash
./scripts/clean-development.sh --backup
```

バックアップは`backup_YYYYMMDD_HHMMSS/`フォルダに作成されます。

### 4. 完全なクリーンアップ

確認なしで即座にクリーンアップ：

```bash
./scripts/clean-development.sh --force
```

## バックアップとリストア

### バックアップの場所

バックアップは以下の形式で作成されます：
```
backup_20240714_153045/
├── implementation/
├── results/
└── security/
```

### 手動リストア

必要に応じてバックアップから復元：

```bash
# 実装ファイルのみ復元
cp -r backup_20240714_153045/implementation/ ./

# 結果ファイルのみ復元
cp -r backup_20240714_153045/results/ ./

# 全体を復元
cp -r backup_20240714_153045/* ./
```

## セキュリティ注意事項

### ⚠️ 重要な警告

1. **認証情報の取り扱い**
   - `security/`フォルダには機密情報が含まれています
   - バックアップファイルも適切に保護してください

2. **本番環境での使用**
   - 本番環境では絶対に`--force`オプションを使用しないでください
   - 必ず`--dry-run`で確認してからクリーンアップしてください

3. **Git管理**
   - バックアップフォルダは`.gitignore`に追加することを推奨します

### 推奨セキュリティ設定

```bash
# バックアップフォルダを.gitignoreに追加
echo "backup_*/" >> .gitignore

# バックアップフォルダの権限を制限
chmod 700 backup_*/
```

## トラブルシューティング

### よくある問題

1. **権限エラー**
   ```bash
   # スクリプトに実行権限を付与
   chmod +x ./scripts/clean-development.sh
   ```

2. **削除できないファイル**
   ```bash
   # ファイルの使用状況を確認
   lsof | grep implementation
   
   # プロセスを終了してから再試行
   ./scripts/clean-development.sh
   ```

3. **間違ったディレクトリで実行**
   ```
   [ERROR] ClaudeFlowプロジェクトディレクトリではありません
   ```
   → ClaudeFlowのルートディレクトリで実行してください

### エラー対処法

スクリプトは以下の安全性チェックを行います：

- ClaudeFlowプロジェクトディレクトリかの確認
- 重要ファイルの存在確認
- 削除対象の事前チェック

## 自動化

### CI/CDでの使用

```yaml
# GitHub Actions例
- name: Clean ClaudeFlow Development Files
  run: |
    cd ClaudeFlow
    ./scripts/clean-development.sh --force
```

### 定期クリーンアップ

```bash
# cronで週次クリーンアップ
0 2 * * 0 cd /path/to/ClaudeFlow && ./scripts/clean-development.sh --backup --force
```

## まとめ

ClaudeFlowクリーンアップツールを使用することで：

✅ **安全な削除** - 重要なファイルは保護されます  
✅ **事前確認** - dry-runモードで削除対象を確認  
✅ **バックアップ** - 削除前にファイルを保護  
✅ **自動化対応** - スクリプトでの自動実行が可能  

新しいプロジェクトを開始する際は、クリーンアップ後に`./scripts/run-pipeline.sh`を実行してください。