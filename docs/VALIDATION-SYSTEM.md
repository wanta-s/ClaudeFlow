# ClaudeFlow 検証システム

## 概要

ClaudeFlowの検証システムは、パックマンゲームのエラー経験から学んだ教訓を基に設計された、包括的なコード品質保証システムです。実装フェーズで生成されたコードに対して、自動的に構文チェック、エラーパターン検出、セキュリティ検証を行います。

## 主な機能

### 1. 自動検証
- **構文チェック**: JavaScript/TypeScript、Python、HTMLなどの構文エラーを検出
- **ランタイムエラー検出**: よくあるランタイムエラーパターンを事前に検出
- **セキュリティチェック**: 脆弱性につながる可能性のあるコードを検出
- **ベストプラクティス**: コーディング規約違反を検出

### 2. エラーパターンライブラリ
`validation/patterns/error-patterns.json`に定義された、言語別のエラーパターンを使用：

- **DOM操作の安全性**: 要素の存在確認
- **配列境界チェック**: 配列アクセスの安全性
- **非同期エラーハンドリング**: try-catchの適切な使用
- **認証情報の管理**: ハードコードされた秘密情報の検出

### 3. 段階的検証プロセス
1. **初期実装** → 構文検証
2. **エラー修正** → ランタイム検証
3. **最適化** → パフォーマンス・セキュリティ検証

## 使用方法

### 手動検証
```bash
# 単一ファイルの検証
./scripts/auto-validate.sh path/to/file.js

# レポート出力付き検証
./scripts/auto-validate.sh path/to/file.js -o report.txt

# 言語を指定した検証
./scripts/auto-validate.sh path/to/file -l javascript
```

### 自動検証（パイプライン統合）
実装フェーズで自動的に実行されます。無効化する場合：
```bash
export CLAUDEFLOW_AUTO_VALIDATE=false
```

### プログラム内での使用
```bash
# common-functions.shを読み込んだ後
validate_implementation "/path/to/implementation"
```

## エラーパターンの追加

`validation/patterns/error-patterns.json`に新しいパターンを追加：

```json
{
  "javascript": {
    "your_pattern_name": {
      "pattern": "正規表現パターン",
      "message": "エラーメッセージ",
      "severity": "error|warning|info|critical",
      "fix_template": "修正テンプレート"
    }
  }
}
```

## 検証レポート

検証結果は以下の形式で出力されます：

```
=== ClaudeFlow 検証レポート ===
ファイル: example.js
言語: javascript
実行日時: 2025-07-16 10:00:00

=== 構文チェック ===
✅ 構文チェック: OK

=== エラーパターン検査 ===
[ERROR] Line 25: DOM要素の存在チェックが必要です
  コード: document.getElementById('button').addEventListener...

[WARNING] Line 42: 配列の境界チェックが必要です
  コード: array[index].value = newValue;

検出された問題: Critical: 0, Error: 1, Warning: 1, Info: 0
```

## パックマンゲームから学んだ教訓

1. **DOM要素の存在確認**
   ```javascript
   // 悪い例
   document.getElementById('button').addEventListener('click', handler);
   
   // 良い例
   const button = document.getElementById('button');
   if (button) {
       button.addEventListener('click', handler);
   }
   ```

2. **配列境界チェック**
   ```javascript
   // 悪い例
   return maze[y][x];
   
   // 良い例
   if (y >= 0 && y < maze.length && x >= 0 && x < maze[y].length) {
       return maze[y][x];
   }
   ```

3. **エラーハンドリング**
   ```javascript
   // 良い例
   try {
       // ゲームループ
   } catch (error) {
       console.error('Game error:', error);
       // 適切なエラー処理
   }
   ```

## 設定オプション

環境変数で動作を制御：

```bash
# 自動検証の有効/無効
export CLAUDEFLOW_AUTO_VALIDATE=true

# 検証レベル（strict: 警告もエラーとして扱う）
export CLAUDEFLOW_VALIDATE_LEVEL=standard

# カスタムパターンファイル
export CLAUDEFLOW_PATTERNS_FILE=/path/to/custom-patterns.json
```

## トラブルシューティング

### 検証が実行されない
- `CLAUDEFLOW_AUTO_VALIDATE`が`false`に設定されていないか確認
- `auto-validate.sh`に実行権限があるか確認

### パターンが検出されない
- 正規表現パターンが正しいか確認
- エスケープが必要な文字が適切にエスケープされているか確認

### 誤検出が多い
- パターンの精度を上げる
- severityレベルを調整する

## 今後の拡張予定

1. **自動修正機能**: 検出されたエラーの自動修正
2. **カスタムルール**: プロジェクト固有のルール定義
3. **IDE統合**: VSCode拡張機能との連携
4. **パフォーマンス分析**: 実行時間とメモリ使用量の分析

## まとめ

ClaudeFlowの検証システムは、エラーを早期に発見し、品質の高いコードを生成するための重要な機能です。パックマンゲームのような実装エラーを防ぎ、より堅牢なアプリケーション開発を支援します。