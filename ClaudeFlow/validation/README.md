# ClaudeFlow Validation System

## 概要
このディレクトリには、ClaudeFlowの実装フェーズで生成されたコードを検証するためのツールとパターンが含まれています。

## ディレクトリ構造
- `patterns/` - エラーパターンとベストプラクティスの定義
- `scripts/` - 検証スクリプト
- `templates/` - エラーハンドリングテンプレート
- `reports/` - 検証レポートの保存場所

## 使用方法
```bash
# 自動検証の実行
./scripts/auto-validate.sh <file_path>

# 特定の言語での検証
./scripts/validate-javascript.sh <file_path>
```

## サポートされている言語
- JavaScript/TypeScript
- Python
- Java
- Go
- その他（拡張可能）