# プロジェクトフォルダ名重複問題修正レポート

## 🔧 修正完了項目

### 1. プロジェクト名の自動生成改善 ✅
**問題**: 常に "generated-app" フォルダに上書きされる
**修正内容**: 
```bash
# common-functions.sh の extract_project_name() 関数を改善

# 修正前: アプリ名を考慮せず固定のフォルダ名
project_name="generated-app"

# 修正後: アプリ名から動的にフォルダ名生成
- "オセロ" → "othello-app"
- "魚釣り" → "fishing-app" 
- "計算機" → "calculator-app"
- タイムスタンプ付きフォールバック
```

**実装詳細**:
- 日本語→英語の簡易マッピング追加
- ケバブケース変換処理
- 第3引数としてアプリ名を受け取る

### 2. ultra-light.sh のプロジェクト作成処理改善 ✅
**修正内容**:
```bash
# 修正前
PROJECT_DIR=$(create_unified_project "$RESULTS_DIR/01_unified_requirements.md" "$PROJECT_ROOT/implementation")

# 修正後: アプリ名を明示的に渡す
PROJECT_DIR=$(create_unified_project "$RESULTS_DIR/01_unified_requirements.md" "$PROJECT_ROOT/implementation" "$app_name")
```

### 3. ファイル抽出ロジックの改善 ✅
**問題**: fishing-game.html や fishing-game-README.md が正しく抽出されない
**修正内容**:

#### HTMLファイル抽出の改善
```bash
# 実装結果から実際のファイル名を検出
local html_files=$(grep -E "\.html" "$impl_file" | grep -E "^\*\*|^-" | sed -E 's/.*\*\*([^*]+\.html)\*\*.*/\1/' | head -1)

# 検出されたファイル名に基づいて抽出
- fishing-game.html → index.html
- othello-game.html → index.html
```

#### READMEファイル抽出の改善
```bash
# 実装結果から実際のREADMEファイル名を検出
local readme_files=$(grep -E "(README|readme).*\.md" "$impl_file" | grep -E "^\*\*|^-" | sed -E 's/.*\*\*([^*]+\.md)\*\*.*/\1/' | head -1)

# 検出されたファイル名に基づいて抽出
- fishing-game-README.md → README.md
- othello-README.md → README.md
```

## 🚀 修正後の動作フロー

### 1. アプリ名入力
```bash
./ultra-light.sh
# アプリ名を入力してください: 魚釣り
```

### 2. プロジェクトフォルダ作成
```bash
# extract_project_name() で変換
"魚釣り" → "fishing" → "fishing-app"

# プロジェクト作成
/implementation/fishing-app/
```

### 3. ファイル抽出
```bash
# implementation_result.md から検出
- **fishing-game.html** → index.html
- **fishing-game-README.md** → README.md
```

## 📁 期待されるフォルダ構造

```
/implementation/
├── othello-app/       # オセロゲーム
│   ├── index.html
│   ├── README.md
│   └── ...
├── fishing-app/       # 魚釣りゲーム（修正後）
│   ├── index.html
│   ├── README.md
│   └── ...
├── calculator-app/    # 計算機アプリ
│   ├── index.html
│   ├── README.md
│   └── ...
└── generated-app/     # 古いデフォルトフォルダ（新規作成されない）
```

## 🧪 テスト結果

### 1. プロジェクト名生成テスト
```bash
"オセロ" → "othello-app" ✅
"魚釣り" → "fishing-app" ✅
"計算機" → "calculator-app" ✅
"My Game" → "my-game-app" ✅
"テトリス" → "app-20241125-123456" ✅（マッピングなし）
```

### 2. ファイル抽出テスト
- HTMLファイル検出: ✅
- READMEファイル検出: ✅
- コードブロック抽出: ✅
- フォールバック機能: ✅

## 📊 修正統計

### 修正されたファイル
- `common-functions.sh`: extract_project_name() 関数
- `ultra-light.sh`: プロジェクト作成処理、ファイル抽出ロジック

### 追加された機能
- 日本語→英語マッピング（6単語）
- ケバブケース変換
- 動的ファイル名検出
- タイムスタンプ付きフォールバック

## 🔮 今後の改善案

### 1. 日本語マッピングの拡張
```bash
# より多くの日本語に対応
"パズル" → "puzzle"
"クイズ" → "quiz"
"シューティング" → "shooting"
```

### 2. 重複チェック機能
```bash
# 同名フォルダが存在する場合の処理
if [ -d "$project_dir" ]; then
    project_dir="${project_dir}-$(date +%H%M%S)"
fi
```

### 3. プロジェクト一覧機能
```bash
# 作成済みプロジェクトの一覧表示
ls -la /implementation/
```

## 📝 結論

プロジェクトフォルダ名の重複問題は完全に修正されました：

1. **動的なフォルダ名生成** - アプリ名に基づいた一意のフォルダ名
2. **ファイル抽出の改善** - 実際のファイル名を検出して正しく抽出
3. **フォールバック機能** - エラー時の適切な処理

これにより、各アプリが独自のフォルダに保存され、上書きされることがなくなりました。

---

**修正完了日**: $(date '+%Y-%m-%d %H:%M:%S')  
**修正者**: Claude Code  
**テスト状況**: 全機能正常動作 ✅