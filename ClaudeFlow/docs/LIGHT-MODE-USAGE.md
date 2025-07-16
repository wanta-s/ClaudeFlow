# 軽量モード使用ガイド

ClaudeFlowの軽量化機能により、簡単なアプリを数分で作成できます。

## 🚀 超軽量モード（推奨）

### 対象アプリ
- オセロゲーム
- 計算機
- 簡単なクイズアプリ
- 単機能のWebツール

### 使用方法
```bash
cd ClaudeFlow/scripts
./start.sh
# → 1) 超軽量モード を選択
# → アプリ名を入力（例: "オセロゲーム"）
# → 5分で完成！
```

### 成果物
- `index.html` - 動作するWebアプリ
- `README.md` - 使用方法
- `COMPLETE_DOCUMENTATION.md` - 全工程記録

## ⚡ 軽量モード

### 対象アプリ
- TODOアプリ
- 簡単なCRUDアプリ
- 基本的なフォームアプリ

### 使用方法
```bash
cd ClaudeFlow/scripts
export CLAUDEFLOW_MODE=light
./run-pipeline.sh ../results/00_user_input.md
```

## 📋 機能比較

| モード | フェーズ数 | 時間 | 品質 | 適用例 |
|--------|-----------|------|------|--------|
| 超軽量 | 3 | 5分 | 基本動作 | オセロ、計算機 |
| 軽量 | 5 | 15分 | 標準品質 | TODO、CRUD |
| 標準 | 9 | 60分 | 高品質 | 業務システム |

## 🔧 設定のカスタマイズ

### 永続的な軽量モード設定
```bash
cd ClaudeFlow/scripts
./set-light-mode.sh ultra_light  # 超軽量モードに設定
./set-light-mode.sh light        # 軽量モードに設定
./set-light-mode.sh reset        # 設定リセット
```

### 環境変数での制御
```bash
export CLAUDEFLOW_MODE=ultra_light
export CLAUDEFLOW_IMPL_LEVEL=1
export CLAUDEFLOW_FEATURE_SELECTION=C
export AUTO_CONTINUE=true
```

## 🧪 動作確認手順

### 1. オセロゲームの作成テスト
```bash
cd ClaudeFlow/scripts
./ultra-light.sh
# アプリ名: "オセロゲーム"
```

### 2. 生成ファイルの確認
```bash
ls implementation/*/index.html
cat implementation/*/README.md
```

### 3. 動作テスト
```bash
# ブラウザでindex.htmlを開く
open implementation/*/index.html
```

## 💡 最適化のコツ

### アプリ名の付け方
- **具体的**: "オセロゲーム" > "ゲーム"
- **機能明記**: "計算機アプリ" > "計算"
- **目的記載**: "家計簿アプリ" > "アプリ"

### 期待する動作の説明
アプリ名入力時に、期待する動作を簡潔に説明すると品質が向上：
```
アプリ名: オセロゲーム - 8x8盤面で2人対戦できるブラウザゲーム
```

## 🔍 トラブルシューティング

### よくある問題と解決策

#### 1. 生成されたHTMLが動作しない
```bash
# テスト結果を確認
cat implementation/*/test_result.md
```

#### 2. タイムアウトエラーが発生
```bash
# タイムアウトを延長
export CLAUDEFLOW_TIMEOUT_SPEC=600
```

#### 3. 機能が不足している
- 軽量モードまたは標準モードを使用
- より詳細な要件を記述

## 📚 参考資料

- [README.md](../README.md) - 基本的な使用方法
- [DEVELOPMENT-FLOW.md](../docs/DEVELOPMENT-FLOW.md) - 開発フロー詳細
- [manage-projects.sh](../scripts/manage-projects.sh) - プロジェクト管理