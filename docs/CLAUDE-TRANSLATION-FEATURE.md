# Claude AIを使った日本語プロジェクト名変換機能

## 🎯 概要

ClaudeFlowにClaude AIを使った高度な日本語→英語プロジェクト名変換機能を実装しました。これにより、より自然で意味を考慮した英語フォルダ名が生成されます。

## 🚀 機能の特徴

### 1. インテリジェントな変換

従来の機械的な変換ではなく、Claude AIが文脈と意味を理解して適切な英語名を提案します。

**変換例：**
| 日本語 | Claude変換 | 従来の変換 |
|--------|-----------|-----------|
| 家計簿アプリ | household-budget-app | kakeibo-apuri-app |
| 英単語学習ツール | english-vocabulary-app | eitango-gakushu-tsu-ru-app |
| 料理レシピ管理 | recipe-manager-app | ryouri-reshipi-kanri-app |
| 天気予報 | weather-forecast-app | tenki-yohou-app |
| タスク管理 | task-manager-app | tasuku-kanri-app |

### 2. 変換の優先順位

```
1. Claude AI変換（最優先）
   ↓ 失敗時
2. 事前定義マッピング（56単語）
   ↓ マッチしない場合
3. Python3ローマ字変換
   ↓ Python3がない場合
4. Sedによる基本変換
   ↓ 全て失敗時
5. タイムスタンプ付きフォールバック
```

## 🔧 技術仕様

### Claude API呼び出し

```bash
# Claudeプロンプト
local claude_prompt="以下の日本語のアプリ名を適切な英語のプロジェクトフォルダ名に変換してください。

アプリ名: $app_name

要件:
1. 意味を考慮した適切な英語名
2. 小文字のみ使用
3. 単語間はハイフン(-)で区切る
4. 英数字とハイフンのみ使用（特殊文字は使わない）
5. 簡潔で分かりやすい名前
6. 一般的な英語表現を使用

変換結果のみを1行で出力してください。"
```

### 実装の特徴

1. **タイムアウト設定** - 10秒のタイムアウトで高速化
2. **エラーハンドリング** - 失敗時は既存の変換方法にフォールバック
3. **環境変数制御** - `CLAUDEFLOW_USE_CLAUDE_TRANSLATION=false`で無効化可能
4. **ログ出力** - 変換の成功/失敗をログに記録

## 📊 使用例

### 基本的な使用

```bash
# ultra-light.sh実行時
./ultra-light.sh
# アプリ名を入力してください: 家計簿管理
# → Claudeを使用して日本語アプリ名を変換中...
# → Claude変換成功: 家計簿管理 → household-budget-manager
# → /implementation/household-budget-manager-app/ が作成される
```

### 環境変数での制御

```bash
# Claude変換を無効化
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=false
./ultra-light.sh

# Claude変換を有効化（デフォルト）
export CLAUDEFLOW_USE_CLAUDE_TRANSLATION=true
./ultra-light.sh
```

## 🎨 Claude変換のメリット

### 1. 意味的に正確な変換

- **家計簿** → `household-budget` （家計の予算管理を正確に表現）
- **英単語学習** → `english-vocabulary` （学習内容を明確に）
- **料理レシピ** → `recipe-manager` （管理ツールであることを示唆）

### 2. 業界標準の命名規則

- 一般的な英語プロジェクト名の慣習に従う
- GitHubなどで見つけやすい名前
- 国際的なコラボレーションに適した命名

### 3. 一貫性のある命名

- 同じようなアプリは似た命名パターン
- プロジェクト群の整理がしやすい

## ⚠️ 注意事項

### 1. Claude APIの要件

- `claude` CLIがインストールされている必要があります
- 有効なAPIキーが設定されている必要があります
- ネットワーク接続が必要です

### 2. パフォーマンス

- Claude API呼び出しは1-3秒程度かかる場合があります
- タイムアウト（10秒）を超えると自動的にフォールバック

### 3. コスト

- Claude API使用には料金が発生する場合があります
- 大量のプロジェクト作成時は注意が必要

## 🔍 トラブルシューティング

### Claude変換が動作しない場合

1. **CLIの確認**
   ```bash
   which claude
   claude --version
   ```

2. **環境変数の確認**
   ```bash
   echo $CLAUDEFLOW_USE_CLAUDE_TRANSLATION
   ```

3. **手動テスト**
   ```bash
   echo "家計簿" | claude --no-conversation
   ```

### フォールバックの確認

ログに以下のメッセージが表示される場合：
- `Claude変換に失敗しました。既存の変換方法を使用します。`

これは正常な動作で、自動的に他の変換方法が使用されます。

## 🚀 今後の改善案

1. **キャッシュ機能** - 同じ名前の変換結果をキャッシュ
2. **バッチ変換** - 複数の名前を一度に変換
3. **カスタムルール** - ユーザー定義の変換ルール追加
4. **変換履歴** - 過去の変換結果の参照機能

---

**実装日**: 2025-01-16  
**実装者**: Claude Code  
**バージョン**: 1.0