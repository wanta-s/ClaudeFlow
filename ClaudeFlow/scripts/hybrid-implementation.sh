#!/bin/bash

# ハイブリッド実装スクリプト
# コンテキストエンジニアリングの品質プロセス + インクリメンタルの段階的検証

set -e

# 共通関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# ファイルの安全な読み込み
safe_cat() {
    local file="$1"
    local default_msg="${2:-// File not found: $1}"
    
    if [ -f "$file" ]; then
        cat "$file"
    else
        echo "$default_msg"
    fi
}

# Claude実行の安全なラッパー関数
safe_claude_exec() {
    local prompt="$1"
    local output_file="$2"
    local step_name="$3"
    local max_retries="${4:-3}"
    # 環境変数による設定可能なタイムアウト（ステップ名に応じて）
    local default_timeout=600  # 10分のデフォルトタイムアウト
    case "$step_name" in
        *"機能仕様生成"*)
            default_timeout="${CLAUDEFLOW_TIMEOUT_SPEC:-600}"
            ;;
        *"最小実装"*)
            default_timeout="${CLAUDEFLOW_TIMEOUT_IMPL:-600}"
            ;;
        *"テスト生成"*)
            default_timeout="${CLAUDEFLOW_TIMEOUT_TEST:-450}"
            ;;
        *)
            default_timeout="${CLAUDEFLOW_TIMEOUT_DEFAULT:-600}"
            ;;
    esac
    local timeout="${5:-$default_timeout}"
    
    echo -e "${CYAN}  ⏳ $step_name を実行中...${NC}"
    log_step "$step_name" "START"
    
    local retry_count=0
    local success=false
    local response=""
    
    while [ $retry_count -lt $max_retries ] && [ "$success" = "false" ]; do
        if [ $retry_count -gt 0 ]; then
            echo -e "${YELLOW}  リトライ $retry_count/$max_retries...${NC}"
            log_step "$step_name" "RETRY" "試行 $retry_count"
            sleep $((retry_count * 5))  # リトライ間隔を徐々に延長
        fi
        
        # プロンプトを一時ファイルに保存（特殊文字のエスケープ問題を回避）
        local temp_prompt=$(mktemp)
        echo "$prompt" > "$temp_prompt"
        
        # タイムアウト付きでClaudeを実行
        if response=$(timeout $timeout bash -c "cat '$temp_prompt' | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' 2>&1"); then
            echo "$response" > "$output_file"
            log_claude_call "$step_name" "$output_file" "SUCCESS"
            log_step "$step_name" "SUCCESS"
            success=true
            rm -f "$temp_prompt"  # 一時ファイルを削除
            return 0
        else
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                echo -e "${RED}  ⚠ $step_name がタイムアウトしました（${timeout}秒）${NC}"
                log_error_detail "$step_name" "タイムアウト（${timeout}秒）"
                response="// Timeout after ${timeout} seconds"
            else
                echo -e "${RED}  ⚠ $step_name でエラーが発生しました${NC}"
                echo -e "${YELLOW}  エラー: $response${NC}"
                log_error_detail "$step_name" "$response"
            fi
            rm -f "$temp_prompt"  # エラー時も一時ファイルを削除
        fi
        
        ((retry_count++))
    done
    
    # すべてのリトライが失敗した場合
    rm -f "$temp_prompt"  # 一時ファイルを削除
    echo "// Error in $step_name after $max_retries attempts: $response" > "$output_file"
    log_claude_call "$step_name" "$output_file" "ERROR"
    log_step "$step_name" "ERROR" "最大リトライ回数到達"
    return 1
}

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# プロジェクトディレクトリ
PROJECT_ROOT="$(dirname "$0")/../.."
RESULTS_DIR="$PROJECT_ROOT/results"
BASE_IMPLEMENTATION_DIR="$PROJECT_ROOT/implementation"
CONTEXT_DIR="$PROJECT_ROOT/.context"

# 引数処理
REQUIREMENTS_FILE="${1:-$RESULTS_DIR/03_requirements_result.md}"
DESIGN_FILE="${2:-$RESULTS_DIR/05_design_result.md}"

# 統一プロジェクト構造を作成
if [ -f "$REQUIREMENTS_FILE" ]; then
    PROJECT_DIR=$(create_unified_project "$REQUIREMENTS_FILE" "$BASE_IMPLEMENTATION_DIR")
    IMPLEMENTATION_DIR="$PROJECT_DIR/src"
    TESTS_DIR="$PROJECT_DIR/tests"
    log_info "統一プロジェクト構造で実行: $PROJECT_DIR"
else
    # 従来の方式をフォールバック
    mkdir -p "$BASE_IMPLEMENTATION_DIR"
    IMPLEMENTATION_DIR="$BASE_IMPLEMENTATION_DIR"
    TESTS_DIR="$PROJECT_ROOT/tests"
    PROJECT_DIR="$BASE_IMPLEMENTATION_DIR"
    log_warning "要件ファイルが見つかりません。従来の構造を使用します。"
fi

mkdir -p "$CONTEXT_DIR"
mkdir -p "$TESTS_DIR"
METRICS_FILE="$CONTEXT_DIR/code_metrics.log"

# コンテキストファイル
CONTEXT_FILE="$CONTEXT_DIR/CONTEXT.md"
PATTERNS_FILE="$CONTEXT_DIR/PATTERNS.md"

# 機能リスト
declare -a features

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}    ハイブリッド実装モード (CE + Incremental)   ${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# 開始時間を記録
start_time=$(date +%s)

# ログファイルを初期化
init_log_file "hybrid-implementation"

# 自動実行モードの表示
if [ "${AUTO_CONTINUE:-true}" = "true" ]; then
    echo -e "${GREEN}🚀 自動実行モード: 有効${NC}"
    echo -e "${YELLOW}   (中断するには Ctrl+C を押してください)${NC}"
else
    echo -e "${BLUE}📋 確認モード: 各機能実装後に確認します${NC}"
fi
echo ""

# 実装レベルの選択
# 環境変数が設定されている場合はそれを使用
if [ -n "$CLAUDEFLOW_IMPL_LEVEL" ]; then
    implementation_level="$CLAUDEFLOW_IMPL_LEVEL"
    echo -e "${GREEN}実装レベル「$implementation_level」を使用します（環境変数から設定済み）${NC}"
else
    echo "実装レベルを選択してください:"
    echo "1) ラフレベル (プロトタイプ向け、最小限の実装)"
    echo "2) 標準レベル (通常品質、基本的なエラーハンドリング)"
    echo "3) 商用レベル (完全なエラーハンドリング、ログ、監視機能)"
    echo -n "選択 (1-3) [デフォルト: 2]: "
    read -r implementation_level
fi

case "$implementation_level" in
    1)
        IMPLEMENTATION_LEVEL="rough"
        QUALITY_THRESHOLD=1
        echo -e "${YELLOW}ラフレベルで実装します${NC}"
        ;;
    3)
        IMPLEMENTATION_LEVEL="commercial"
        QUALITY_THRESHOLD=3
        echo -e "${GREEN}商用レベルで実装します${NC}"
        ;;
    *)
        IMPLEMENTATION_LEVEL="standard"
        QUALITY_THRESHOLD=2
        echo -e "${BLUE}標準レベルで実装します${NC}"
        ;;
esac

echo ""
echo "🎯 実行するステップ:"
case "$IMPLEMENTATION_LEVEL" in
    "rough")
        echo "  1. 仕様生成（簡易版）"
        echo "  2. 最小実装"
        echo "  4. 即時テスト（簡易版）"
        echo "  9. メトリクス記録"
        echo ""
        echo -e "${YELLOW}※ ラフレベルでは品質検証・リファクタリング・最適化をスキップします${NC}"
        ;;
    "standard")
        echo "  1. 仕様生成"
        echo "  2. 最小実装"
        echo "  3. 品質検証（1回）"
        echo "  4. 即時テスト"
        echo "  5. リファクタリング"
        echo "  9. メトリクス記録"
        echo ""
        echo -e "${BLUE}※ 標準レベルでは包括的テスト・最適化・パターン抽出をスキップします${NC}"
        ;;
    *)
        echo "  1. 仕様生成 (Context Engineering)"
        echo "  2. 最小実装"
        echo "  3. 品質検証研究 (信頼性・保守性・再利用性)"
        echo "  4. 即時テスト (Incremental)"
        echo "  5. リファクタリング"
        echo "  6. 包括的テスト"
        echo "  7. 最適化とAPI仕様生成"
        echo "  8. パターンライブラリ更新"
        echo "  9. メトリクス記録"
        ;;
esac
echo ""

# 要件ファイルと設計ファイルの存在確認
if [ ! -f "$REQUIREMENTS_FILE" ] || [ ! -f "$DESIGN_FILE" ]; then
    echo -e "${RED}エラー: 要件ファイルまたは設計ファイルが見つかりません${NC}"
    echo "要件ファイル: $REQUIREMENTS_FILE"
    echo "設計ファイル: $DESIGN_FILE"
    echo "使用方法: $0 <requirements_file> <design_file>"
    exit 1
fi

# コンテキストファイルの初期化
if [ ! -f "$CONTEXT_FILE" ]; then
    echo "# コーディングコンテキスト" > "$CONTEXT_FILE"
    echo "" >> "$CONTEXT_FILE"
    echo "## プロジェクト概要" >> "$CONTEXT_FILE"
    echo "" >> "$CONTEXT_FILE"
    
    # 要件と設計から抽出
    if [ -f "$REQUIREMENTS_FILE" ]; then
        echo "### 要件" >> "$CONTEXT_FILE"
        head -50 "$REQUIREMENTS_FILE" >> "$CONTEXT_FILE"
    fi
fi

# パターンファイルの初期化
if [ ! -f "$PATTERNS_FILE" ]; then
    echo "# コードパターンライブラリ" > "$PATTERNS_FILE"
    echo "" >> "$PATTERNS_FILE"
    echo "実装中に発見・確立されたパターンを記録" >> "$PATTERNS_FILE"
    echo "" >> "$PATTERNS_FILE"
fi

# メトリクスファイルの初期化
if [ ! -f "$METRICS_FILE" ]; then
    echo "# コードメトリクス記録" > "$METRICS_FILE"
    echo "Date,Feature,LOC,Level,TestCoverage,Quality" >> "$METRICS_FILE"
fi

# 機能の特定
echo -e "${BLUE}機能を分析中...${NC}"

# 新規プロジェクトの場合は既存features.jsonを使用せず、要件から新規生成
FEATURES_JSON_PATH="$IMPLEMENTATION_DIR/features.json"

# 環境変数でfeatures.json使用を強制する場合のみ既存ファイルを使用
if [ "${CLAUDEFLOW_FORCE_FEATURES_REUSE:-false}" = "true" ]; then
    if [ -f "$IMPLEMENTATION_DIR/features.json" ]; then
        echo -e "${GREEN}既存のfeatures.jsonを使用します（強制モード）: $FEATURES_JSON_PATH${NC}"
    elif [ -f "../implementation/features.json" ]; then
        FEATURES_JSON_PATH="../implementation/features.json"
        echo -e "${GREEN}既存のfeatures.jsonを使用します（強制モード）: $FEATURES_JSON_PATH${NC}"
    else
        echo -e "${YELLOW}features.jsonが見つかりません。新規作成します: $FEATURES_JSON_PATH${NC}"
    fi
else
    # デフォルトは新規生成（要件定義から）
    echo -e "${BLUE}要件定義から新しいfeatures.jsonを生成します: $FEATURES_JSON_PATH${NC}"
    # 既存ファイルがある場合は削除
    rm -f "$FEATURES_JSON_PATH" 2>/dev/null || true
fi
debug_var "IMPLEMENTATION_DIR" "$IMPLEMENTATION_DIR"
debug_var "FEATURES_JSON_PATH" "$FEATURES_JSON_PATH"

if [ -f "$FEATURES_JSON_PATH" ]; then
    # JSONから機能リストを抽出
    if command -v jq &> /dev/null; then
        # jqが利用可能な場合
        while IFS= read -r feature; do
            feature_id=$(echo "$feature" | jq -r '.id')
            feature_name=$(echo "$feature" | jq -r '.name')
            feature_desc=$(echo "$feature" | jq -r '.description')
            features+=("${feature_id}:${feature_name}:${feature_desc}")
        done < <(jq -c '.features[]' "$FEATURES_JSON_PATH")
    else
        # jqが利用できない場合はPythonを使用
        echo -e "${YELLOW}jqが見つかりません。Pythonを使用してJSONを解析します...${NC}"
        
        # シンプルなPython実行（プロセス置換使用）
        while IFS= read -r line; do
            [ -n "$line" ] && features+=("$line")
        done < <(python3 -c "
import json
try:
    with open('$FEATURES_JSON_PATH', 'r') as f:
        data = json.load(f)
        for feature in data['features']:
            print(f\"{feature['id']}:{feature['name']}:{feature['description']}\")
except:
    pass
" 2>/dev/null)
    fi
else
    # features.jsonが存在しない場合は生成
    echo -e "${YELLOW}features.jsonを生成中...${NC}"
    
    features_prompt="以下の要件と設計から、実装すべき独立した機能をリストアップし、features.json形式で出力してください。

要件:
$(cat "$REQUIREMENTS_FILE")

設計:
$(cat "$DESIGN_FILE")

重要な指示:
1. 各機能は150-200行程度で実装可能な単位に分割
2. 各機能にcore属性を追加し、以下の基準で判定してください：

**コア機能判定基準**
プロジェクトの本質的価値を実現する機能を「コア機能」として識別してください。

判定の問い：
- その機能がなければアプリケーションの存在意義がなくなるか？
- ユーザーがアプリを使う主目的に直結しているか？
- 競合との差別化要因となっているか？

**一般原則**
- 認証、ユーザー管理、設定、統計、通知などは通常「非コア」
- アプリの主要な価値提供に直結する機能が「コア」
- データの作成・閲覧・操作など、ユーザーの主要タスクが「コア」

**カテゴリ別の例**
- ビジネスアプリ: 業務プロセスの中核機能が core: true
- ゲーム: ゲームプレイ、操作、進行システムが core: true
- 教育: 学習コンテンツ表示、進捗管理が core: true
- コミュニケーション: メッセージ送受信、リアルタイム同期が core: true
- クリエイティブツール: 作成、編集、エクスポート機能が core: true

出力形式（JSON）:
{
  \"features\": [
    {
      \"id\": \"feature_001\",
      \"name\": \"機能名\",
      \"description\": \"機能の説明\",
      \"priority\": 1,
      \"core\": true,
      \"dependencies\": []
    }
  ]
}"

    # features.jsonを直接生成
    debug_info "Claudeに機能生成を依頼中..."
    features_json_response=$(echo "$features_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' 2>&1)
    
    # 応答の検証
    if [ -z "$features_json_response" ]; then
        echo -e "${RED}エラー: Claudeからの応答が空です${NC}" >&2
        echo -e "${YELLOW}既存のfeatures.jsonを使用します${NC}" >&2
    else
        # 一時ファイルに保存して検証
        temp_json=$(mktemp)
        echo "$features_json_response" > "$temp_json"
        
        # JSONの妥当性チェック
        if command -v jq &> /dev/null; then
            if jq empty "$temp_json" 2>/dev/null && jq '.features' "$temp_json" >/dev/null 2>&1; then
                cp "$temp_json" "$FEATURES_JSON_PATH"
                echo -e "${GREEN}features.jsonを正常に生成しました${NC}" >&2
            else
                echo -e "${RED}エラー: 生成されたJSONが無効です${NC}" >&2
                echo -e "${YELLOW}デバッグ: 応答の最初の200文字:${NC}" >&2
                head -c 200 "$temp_json" >&2
                rm -f "$temp_json"
                # 既存のfeatures.jsonを探す
                if [ ! -f "$FEATURES_JSON_PATH" ]; then
                    echo -e "${RED}既存のfeatures.jsonも見つかりません${NC}" >&2
                    exit 1
                fi
            fi
        else
            # Python でのチェック
            if python3 -c "import json; json.load(open('$temp_json'))" 2>/dev/null; then
                cp "$temp_json" "$FEATURES_JSON_PATH"
                echo -e "${GREEN}features.jsonを正常に生成しました${NC}" >&2
            else
                echo -e "${RED}エラー: 生成されたJSONが無効です${NC}" >&2
                rm -f "$temp_json"
                if [ ! -f "$FEATURES_JSON_PATH" ]; then
                    echo -e "${RED}既存のfeatures.jsonも見つかりません${NC}" >&2
                    exit 1
                fi
            fi
        fi
        rm -f "$temp_json"
    fi
    
    # 生成または既存のJSONから機能リストを抽出
    if [ -f "$FEATURES_JSON_PATH" ]; then
        if command -v jq &> /dev/null; then
            while IFS= read -r feature; do
                feature_id=$(echo "$feature" | jq -r '.id')
                feature_name=$(echo "$feature" | jq -r '.name')
                feature_desc=$(echo "$feature" | jq -r '.description')
                features+=("${feature_id}:${feature_name}:${feature_desc}")
            done < <(jq -c '.features[]' "$FEATURES_JSON_PATH" 2>/dev/null || echo "")
        else
            while IFS= read -r line; do
                features+=("$line")
            done < <(python3 -c "
import json
try:
    with open('$FEATURES_JSON_PATH', 'r') as f:
        data = json.load(f)
        for feature in data.get('features', []):
            print(f\"{feature['id']}:{feature['name']}:{feature['description']}\")
except Exception as e:
    print(f'Error: {e}', file=__import__('sys').stderr)
" 2>/dev/null || echo "")
        fi
    fi
fi

echo -e "${GREEN}${#features[@]}個の機能を特定しました${NC}"
echo ""

# 機能が0個の場合は終了
if [ ${#features[@]} -eq 0 ]; then
    echo -e "${YELLOW}実装する機能が見つかりません。${NC}"
    echo -e "${YELLOW}要件ファイルと設計ファイルを確認してください。${NC}"
    exit 0
fi

# 機能リストの表示と選択
echo -e "${CYAN}=== 検出された機能 ===${NC}"
core_count=0

# コア機能を配列に読み込み（シンプル＆確実）
declare -a core_features_array
if [ -f "$FEATURES_JSON_PATH" ]; then
    printf "コア機能を読み込み中... "
    if command -v jq &> /dev/null; then
        while IFS= read -r core_id; do
            [ -n "$core_id" ] && core_features_array+=("$core_id")
        done < <(jq -r '.features[] | select(.core == true) | .id' "$FEATURES_JSON_PATH" 2>/dev/null)
    else
        while IFS= read -r core_id; do
            [ -n "$core_id" ] && core_features_array+=("$core_id")
        done < <(python3 -c "
import json
try:
    with open('$FEATURES_JSON_PATH', 'r') as f:
        data = json.load(f)
        for feature in data['features']:
            if feature.get('core', False):
                print(feature['id'])
except Exception:
    pass
" 2>/dev/null)
    fi
    printf "完了 (%d個)\n" "${#core_features_array[@]}"
fi

# 配列メンバーシップテスト関数
is_core_feature() {
    local feature_id="$1"
    local core_id
    for core_id in "${core_features_array[@]}"; do
        if [ "$core_id" = "$feature_id" ]; then
            return 0
        fi
    done
    return 1
}

# 機能表示（簡潔版または詳細版）
if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
    # 簡潔モード：コア機能のみ表示
    printf "コア機能検出中... "
    for i in "${!features[@]}"; do
        feature="${features[$i]}"
        if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
            feature_id=$(echo "$feature" | cut -d: -f1)
            if is_core_feature "$feature_id"; then
                core_count=$((core_count + 1))
            fi
        fi
    done
    printf "完了 (%d個のコア機能)\n" "$core_count"
else
    # 詳細モード：従来の表示
    printf "機能一覧を表示中... "
    for i in "${!features[@]}"; do
        feature="${features[$i]}"
        feature_num=$((i + 1))
        
        # 進行状況表示
        if [ $((feature_num % 5)) -eq 0 ]; then
            printf "%d " "$feature_num"
        fi
        
        # features.jsonから読み込んだ場合
        if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
            feature_id=$(echo "$feature" | cut -d: -f1)
            feature_name=$(echo "$feature" | cut -d: -f2)
            
            # 配列ベースのコア機能判定
            if is_core_feature "$feature_id"; then
                printf "\n[CORE] %d. %s\n" "$feature_num" "$feature_name"
                core_count=$((core_count + 1))
            else
                printf "\n       %d. %s\n" "$feature_num" "$feature_name"
            fi
        else
            # 旧形式の場合
            printf "\n       %d. %s\n" "$feature_num" "$feature"
        fi
        
        # 出力フラッシュ
        sync 2>/dev/null || true
    done
    printf "完了\n"
    printf "コア機能: %d個, 全機能: %d個\n" "$core_count" "${#features[@]}"
fi
echo ""
# 環境変数が設定されている場合はそれを使用
if [ -n "$CLAUDEFLOW_FEATURE_SELECTION" ]; then
    feature_selection="$CLAUDEFLOW_FEATURE_SELECTION"
    echo -e "${GREEN}機能選択「$feature_selection」を使用します（環境変数から設定済み）${NC}"
else
    echo -e "${CYAN}実装する機能を選択してください:${NC}"
    echo "  A) すべて実装 (${#features[@]}機能)"
    if [ $core_count -gt 0 ]; then
        echo "  C) コア機能のみ ($core_count機能)"
    fi
    echo "  S) 手動選択"
    echo "  番号指定 (例: 1,3,5)"
    echo -n "選択 [A]: "
    read -r feature_selection
fi

# デフォルトは全機能
if [ -z "$feature_selection" ]; then
    feature_selection="A"
fi

# 選択された機能のインデックスを格納
declare -a selected_indices

case "${feature_selection^^}" in
    "A")
        echo -e "${GREEN}すべての機能を実装します${NC}"
        for i in "${!features[@]}"; do
            selected_indices+=("$i")
        done
        ;;
    "C")
        if [ $core_count -gt 0 ]; then
            echo -e "${GREEN}コア機能のみを実装します${NC}"
            echo -e "${YELLOW}注: 認証機能などの非コア機能への依存は無視されます${NC}"
            
            for i in "${!features[@]}"; do
                feature="${features[$i]}"
                
                if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
                    feature_id=$(echo "$feature" | cut -d: -f1)
                    
                    # 事前に作成した配列を使用してコア機能判定
                    if is_core_feature "$feature_id"; then
                        selected_indices+=("$i")
                    fi
                fi
            done
            echo -e "${GREEN}コア機能選択完了: ${#selected_indices[@]}個の機能を選択${NC}"
        else
            echo -e "${YELLOW}コア機能が見つかりません。すべての機能を実装します${NC}"
            for i in "${!features[@]}"; do
                selected_indices+=("$i")
            done
        fi
        ;;
    "S")
        echo "実装する機能の番号を入力してください (例: 1,3,5):"
        read -r manual_selection
        IFS=',' read -ra selected_nums <<< "$manual_selection"
        for num in "${selected_nums[@]}"; do
            # 番号から配列インデックスに変換（1始まりを0始まりに）
            idx=$((num - 1))
            if [ $idx -ge 0 ] && [ $idx -lt ${#features[@]} ]; then
                selected_indices+=("$idx")
            fi
        done
        echo -e "${GREEN}${#selected_indices[@]}個の機能を選択しました${NC}"
        ;;
    *)
        # 番号指定として処理
        IFS=',' read -ra selected_nums <<< "$feature_selection"
        for num in "${selected_nums[@]}"; do
            # 番号から配列インデックスに変換
            idx=$((num - 1))
            if [ $idx -ge 0 ] && [ $idx -lt ${#features[@]} ]; then
                selected_indices+=("$idx")
            fi
        done
        echo -e "${GREEN}${#selected_indices[@]}個の機能を選択しました${NC}"
        ;;
esac

# 選択された機能の確認
if [ ${#selected_indices[@]} -eq 0 ]; then
    echo -e "${RED}エラー: 実装する機能が選択されていません${NC}"
    echo -e "${YELLOW}デフォルトですべての機能を実装します${NC}"
    for i in "${!features[@]}"; do
        selected_indices+=("$i")
    done
fi

echo -e "${CYAN}=== 実装予定機能一覧 ===${NC}"
for idx in "${selected_indices[@]}"; do
    feature="${features[$idx]}"
    if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
        feature_name=$(echo "$feature" | cut -d: -f2)
        echo "  - $feature_name"
    else
        echo "  - $feature"
    fi
done
echo -e "${GREEN}合計 ${#selected_indices[@]}個の機能を実装します${NC}"
echo ""

# 各機能の実装
feature_index=0
selected_count=${#selected_indices[@]}
processed_count=0
# 環境変数が設定されていても、クリーン実行を強制
skip_until_feature=""

for i in "${!features[@]}"; do
    feature="${features[$i]}"
    feature_index=$((i + 1))
    
    # 選択された機能でない場合はスキップ
    if [[ ! " ${selected_indices[@]} " =~ " ${i} " ]]; then
        continue
    fi
    
    processed_count=$((processed_count + 1))
    
    # features.jsonから読み込んだ場合はIDを使用
    if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
        feature_id=$(echo "$feature" | cut -d: -f1)
        feature_name=$(echo "$feature" | cut -d: -f2)
        feature_desc=$(echo "$feature" | cut -d: -f3)
    else
        # 旧形式の場合
        feature_id="feature_$(printf "%03d" $feature_index)"
        feature_name=$(echo "$feature" | cut -d: -f1 | tr ' ' '_' | sed 's/[^a-zA-Z0-9_]//g')
        feature_desc=$(echo "$feature" | cut -d: -f2-)
    fi
    
    # スキップロジックを無効化（コア機能が確実に実行されるように）
    # if [ -n "$skip_until_feature" ]; then
    #     if [ "$feature_id" != "$skip_until_feature" ]; then
    #         echo -e "${YELLOW}スキップ: $feature_id - $feature_name${NC}"
    #         continue
    #     else
    #         echo -e "${GREEN}再開: $feature_id から実装を開始します${NC}"
    #         skip_until_feature=""
    #     fi
    # fi
    
    # 機能の開始時刻を記録
    feature_start_time=$(date +"%Y-%m-%d %H:%M:%S")
    
    # 機能実装開始表示
    show_feature_start "$processed_count" "$selected_count" "$feature_name"
    log_step "機能実装: $feature_id - $feature_name" "START"
    
    # ステップ1: 機能仕様生成
    show_step "1" "機能仕様生成"
    
    # コア機能モードかどうかを判定
    is_core_mode=false
    if [ "${feature_selection^^}" = "C" ]; then
        is_core_mode=true
    fi
    
    spec_prompt="機能: $feature

以下の要件と設計に基づいて、この機能の詳細仕様を生成してください：

要件:
$(cat "$REQUIREMENTS_FILE")

設計:
$(cat "$DESIGN_FILE")

既存パターン:
$(cat "$PATTERNS_FILE")"

    # コア機能モードの場合の追加指示
    if [ "$is_core_mode" = true ]; then
        spec_prompt+="

重要: これはコア機能実装モードです。
- 認証機能やユーザー管理機能への依存を避けてください
- スタンドアロンで動作する実装を優先してください
- メモリ内データストアまたは簡易なファイルベースの永続化を使用してください
- 後から認証機能を追加可能な設計にしてください"
    fi

    spec_prompt+="

含めるべき内容:
- インターフェース定義
- 主要メソッドのシグネチャ
- エラーケース
- 依存関係"

    # safe_claude_execを使用
    if safe_claude_exec "$spec_prompt" "$IMPLEMENTATION_DIR/${feature_id}_spec.md" "機能仕様生成: $feature_id"; then
        show_step_complete "機能仕様生成" "仕様ファイル生成完了"
    else
        show_step_complete "機能仕様生成" "エラーが発生しました"
        log_error_detail "機能仕様生成" "Claude API呼び出しに失敗しました"
    fi
    
    # ステップ2: 最小実装
    show_step "2" "最小実装"
    
    # 実装レベルに応じた要求事項
    case "$IMPLEMENTATION_LEVEL" in
        "rough")
            level_requirements="- 最小限の機能のみ実装
- エラーハンドリングなし
- 型定義は最小限
- ハッピーパスのみ考慮"
            ;;
        "commercial")
            level_requirements="- 完全な機能実装
- 包括的なエラーハンドリング
- 詳細なログ出力
- パフォーマンス最適化
- セキュリティ考慮
- 監視・メトリクス対応"
            ;;
        *)
            level_requirements="- 基本的な機能のみ実装
- 基本的なエラーハンドリング
- 標準的な型定義
- 主要なエッジケース対応"
            ;;
    esac
    
    impl_prompt="以下の仕様に基づいて、${IMPLEMENTATION_LEVEL}レベルの実装を生成してください：

仕様:
$(safe_cat "$IMPLEMENTATION_DIR/${feature_id}_spec.md" "// 仕様ファイルが見つかりません")

コンテキスト:
$(cat "$CONTEXT_FILE")

実装レベル: ${IMPLEMENTATION_LEVEL}
要求:
$level_requirements"

    # safe_claude_execを使用
    if safe_claude_exec "$impl_prompt" "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" "最小実装: $feature_id"; then
        show_step_complete "最小実装" "実装ファイル生成完了"
        
        # 構文エラーチェック
        if [ "${CLAUDEFLOW_AUTO_VALIDATE:-true}" = "true" ]; then
            log_info "構文エラーチェック中..."
            if validate_syntax "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" "typescript"; then
                log_success "構文チェック合格"
            else
                log_warning "構文エラーを検出しました。修正を試みます..."
                # エラー修正プロンプト
                fix_prompt="以下のTypeScriptコードに構文エラーがあります。修正してください：

$(cat "$IMPLEMENTATION_DIR/${feature_id}_impl.ts")

修正要件：
- すべての構文エラーを修正
- 元の機能を保持
- TypeScriptの正しい構文を使用
- 修正後のコードのみを出力"
                
                # 修正を実行
                if safe_claude_exec "$fix_prompt" "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" "構文修正: $feature_id"; then
                    log_success "構文エラーを修正しました"
                fi
            fi
        fi
    else
        show_step_complete "最小実装" "エラーが発生しました"
        log_error_detail "最小実装" "Claude API呼び出しに失敗しました"
    fi
    
    # ステップ3: 品質検証研究（ラフレベルではスキップ）
    if [ "$IMPLEMENTATION_LEVEL" = "rough" ]; then
        show_step "3" "品質検証研究 - スキップ（ラフレベル）"
        quality_passed=true
        show_step_complete "品質検証研究" "スキップ"
    else
        show_step "3" "品質検証研究（信頼性・保守性・再利用性）"
        
        # 品質検証を最大3回繰り返す（標準レベルは1回のみ）
        iteration=0
        if [ "$IMPLEMENTATION_LEVEL" = "standard" ]; then
            max_iterations=1
        else
            max_iterations=3
        fi
        quality_passed=false
    
    while [ $iteration -lt $max_iterations ] && [ "$quality_passed" = false ]; do
        iteration=$((iteration + 1))
        echo -e "${MAGENTA}  検証ラウンド $iteration/$max_iterations${NC}"
        
        # レベルに応じた品質基準
        case "$IMPLEMENTATION_LEVEL" in
            "rough")
                quality_criteria="すべての項目が2点以上かつ平均2.5点以上なら合格"
                ;;
            "commercial")
                quality_criteria="すべての項目が4点以上かつ平均4.5点以上なら合格"
                ;;
            *)
                quality_criteria="すべての項目が3点以上かつ平均3.5点以上なら合格"
                ;;
        esac
        
        validation_prompt="以下の実装コードの品質を検証してください：

コード:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_impl.ts")

実装レベル: ${IMPLEMENTATION_LEVEL}

検証項目（各5点満点で評価）:
1. 信頼性
   - エラーハンドリングの網羅性
   - 境界値処理
   - 例外ケースの考慮
   
2. 保守性
   - コードの可読性
   - 適切なコメント
   - 単一責任の原則
   
3. 再利用性
   - インターフェースの汎用性
   - 依存関係の最小化
   - 設定可能性

各項目を評価し、改善点を具体的に示してください。
${quality_criteria}とします。

出力形式:
## 評価結果
- 信頼性: X/5
- 保守性: X/5
- 再利用性: X/5
- 平均: X.X/5

## 判定: [合格/不合格]

## 改善提案
（具体的な改善内容）"

        validation_response=$(echo "$validation_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
        echo "$validation_response" > "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md"
        
        # 合格判定をチェック
        if grep -q "判定: 合格" "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md"; then
            quality_passed=true
            if [ "$CLAUDEFLOW_QUIET_MODE" != "true" ]; then
                echo -e "${GREEN}  ✓ 品質基準を満たしました！${NC}"
            fi
        else
            if [ "$CLAUDEFLOW_QUIET_MODE" != "true" ]; then
                echo -e "${YELLOW}  品質基準を満たしていません。改善を実施します...${NC}"
            fi
            
            # 改善実装
            improvement_prompt="以下の検証結果に基づいて、コードを改善してください：

現在のコード:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_impl.ts")

検証結果:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md")

改善されたコード全体を出力してください。"

            improvement_response=$(echo "$improvement_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
            echo "$improvement_response" > "$IMPLEMENTATION_DIR/${feature_id}_impl.ts"
        fi
    done
    
    if [ "$quality_passed" = false ]; then
        if [ "$CLAUDEFLOW_QUIET_MODE" != "true" ]; then
            echo -e "${RED}  ⚠ 最大反復回数に達しました。現在の実装で続行します。${NC}"
        fi
    fi
    
    # 品質検証結果をコンテキストに追加
    echo "" >> "$CONTEXT_FILE"
    echo "## $feature の品質検証結果" >> "$CONTEXT_FILE"
    if [ -f "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md" ]; then
        tail -20 "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md" >> "$CONTEXT_FILE"
    fi
    
    # 品質検証完了表示
    if [ "$IMPLEMENTATION_LEVEL" != "rough" ]; then
        show_step_complete "品質検証研究" "品質検証完了"
    fi
    fi  # 品質検証のif文を閉じる
    
    # ステップ4: 即時テスト（全レベルで実行）
    show_step "4" "即時テスト生成と実行"
    
    # レベルに応じたテスト要求
    if [ "$IMPLEMENTATION_LEVEL" = "rough" ]; then
        test_requirements="- 基本的な正常系のテストのみ
- 最小限の動作確認
- ハッピーパスの検証"
    elif [ "$IMPLEMENTATION_LEVEL" = "standard" ]; then
        test_requirements="- 正常系のテスト
- 基本的な異常系のテスト
- 主要な境界値テスト"
    else
        test_requirements="- 正常系のテスト
- 異常系のテスト
- 境界値テスト
- エッジケースの検証
- パフォーマンステスト考慮"
    fi
    
    test_prompt="以下の実装に対する単体テストを生成してください：

実装:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_impl.ts")

仕様:
$(safe_cat "$IMPLEMENTATION_DIR/${feature_id}_spec.md" "// 仕様ファイルが見つかりません")

実装レベル: ${IMPLEMENTATION_LEVEL}

要求:
$test_requirements"

    # safe_claude_execを使用
    if safe_claude_exec "$test_prompt" "$TESTS_DIR/${feature_id}_test.ts" "テスト生成: $feature_id"; then
        show_step_complete "即時テスト生成と実行" "テスト生成完了"
    else
        show_step_complete "即時テスト生成と実行" "エラーが発生しました"
        log_error_detail "テスト生成" "Claude API呼び出しに失敗しました"
    fi
    
    # ステップ5: リファクタリング（ラフレベルではスキップ）
    if [ "$IMPLEMENTATION_LEVEL" = "rough" ]; then
        show_step "5" "リファクタリング - スキップ（ラフレベル）"
        # ラフレベルでは実装版を最終版として使用
        if [ -f "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" ]; then
            cp "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
            show_step_complete "リファクタリング" "スキップ"
        else
            echo -e "${YELLOW}  警告: ${feature_id}_impl.ts が見つかりません${NC}"
            echo "// Implementation file not found for $feature_id" > "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
            show_step_complete "リファクタリング" "エラー（ファイルなし）"
        fi
    else
        show_step "5" "リファクタリング"
    refactor_prompt="以下のコードをリファクタリングしてください：

コード:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_impl.ts")

既存パターン:
$(cat "$PATTERNS_FILE")

品質検証結果:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_validation_$iteration.md")

重点:
- コードの簡潔性
- パフォーマンス最適化
- 既存パターンの活用"

    refactor_response=$(echo "$refactor_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
    echo "$refactor_response" > "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts"
    show_step_complete "リファクタリング" "リファクタリング完了"
    fi  # リファクタリングのif文を閉じる
    
    # ステップ6: 包括的テスト（商用レベルのみ）
    if [ "$IMPLEMENTATION_LEVEL" = "commercial" ]; then
        show_step "6" "包括的テスト"
    comprehensive_test_prompt="リファクタリング後のコードに対する包括的なテストを生成してください：

コード:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts")

既存テスト:
$(cat "$TESTS_DIR/${feature_id}_test.ts")

追加すべきテスト:
- 統合テスト
- パフォーマンステスト
- セキュリティテスト（該当する場合）"

    comprehensive_test_response=$(echo "$comprehensive_test_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
    echo "$comprehensive_test_response" > "$TESTS_DIR/${feature_id}_comprehensive_test.ts"
    show_step_complete "包括的テスト" "包括的テスト完了"
    else
        show_step "6" "包括的テスト - スキップ（${IMPLEMENTATION_LEVEL}レベル）"
        show_step_complete "包括的テスト" "スキップ"
    fi
    
    # ステップ7: 最適化とAPI仕様（商用レベルのみ）
    if [ "$IMPLEMENTATION_LEVEL" = "commercial" ]; then
        show_step "7" "最適化とAPI仕様生成"
    optimize_prompt="最終的な最適化とAPI仕様を生成してください：

コード:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts")

実装レベル: ${IMPLEMENTATION_LEVEL}

要求:
- 最終的な最適化
- TypeScript型定義
- APIドキュメント
- 使用例"

    # エラーハンドリング付きで実行
    if optimize_response=$(echo "$optimize_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep' 2>&1); then
        echo "$optimize_response" > "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        show_step_complete "最適化とAPI仕様生成" "最適化完了"
    else
        if [ "$CLAUDEFLOW_QUIET_MODE" != "true" ]; then
            echo -e "${RED}  ⚠ ステップ7でエラーが発生しました${NC}"
            echo -e "${YELLOW}  リファクタリング版を最終版として使用します${NC}"
        fi
        cp "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts" "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        show_step_complete "最適化とAPI仕様生成" "エラーで代替版使用"
    fi
    else
        show_step "7" "最適化とAPI仕様 - スキップ（${IMPLEMENTATION_LEVEL}レベル）"
        # 商用レベル以外では適切なファイルを最終版として使用
        if [ "$IMPLEMENTATION_LEVEL" = "standard" ] && [ -f "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts" ]; then
            cp "$IMPLEMENTATION_DIR/${feature_id}_refactored.ts" "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        elif [ -f "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" ]; then
            cp "$IMPLEMENTATION_DIR/${feature_id}_impl.ts" "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        else
            echo -e "${YELLOW}  警告: ${feature_id} の実装ファイルが見つかりません${NC}"
            echo "// Implementation file not found for $feature_id" > "$IMPLEMENTATION_DIR/${feature_id}_final.ts"
        fi
        show_step_complete "最適化とAPI仕様" "スキップ"
    fi
    
    # ステップ8: パターンライブラリ更新（商用レベルのみ）
    if [ "$IMPLEMENTATION_LEVEL" = "commercial" ]; then
        show_step "8" "パターンライブラリ更新"
    pattern_prompt="実装から抽出できる再利用可能なパターンを特定してください：

実装:
$(cat "$IMPLEMENTATION_DIR/${feature_id}_final.ts")

形式:
## パターン名
説明
\`\`\`typescript
コード例
\`\`\`"

    pattern_response=$(echo "$pattern_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
    echo "" >> "$PATTERNS_FILE"
    echo "### $feature のパターン" >> "$PATTERNS_FILE"
    echo "$pattern_response" >> "$PATTERNS_FILE"
    show_step_complete "パターンライブラリ更新" "パターン更新完了"
    else
        show_step "8" "パターンライブラリ更新 - スキップ（${IMPLEMENTATION_LEVEL}レベル）"
        show_step_complete "パターンライブラリ更新" "スキップ"
    fi
    
    # ステップ9: メトリクスの記録（全レベルで実行）
    show_step "9" "メトリクス記録"
    loc=$(wc -l < "$IMPLEMENTATION_DIR/${feature_id}_final.ts" 2>/dev/null || echo "0")
    date=$(date +%Y-%m-%d)
    # 機能名が空の場合はfeature_idを使用
    metric_name="${feature_name:-$feature_id}"
    # 実装レベルに応じた品質評価
    case "$IMPLEMENTATION_LEVEL" in
        "rough")
            quality_level="Prototype"
            ;;
        "commercial")
            quality_level="Production"
            ;;
        *)
            quality_level="Standard"
            ;;
    esac
    echo "$date,$metric_name,$loc,$IMPLEMENTATION_LEVEL,80%,$quality_level" >> "$METRICS_FILE"
    show_step_complete "メトリクス記録" "メトリクス記録完了"
    
    # 機能の終了時刻を記録
    feature_end_time=$(date +"%Y-%m-%d %H:%M:%S")
    
    # 機能実装完了表示
    show_feature_complete "$feature_name"
    
    # 進捗を記録
    log_progress "$feature_id" "$feature_name" "$feature_start_time" "$feature_end_time" "SUCCESS" ""
    log_step "機能実装: $feature_id - $feature_name" "SUCCESS"
    
    # 自動継続（環境変数で制御可能）
    if [ "${AUTO_CONTINUE:-true}" = "false" ]; then
        # 確認モード（環境変数で明示的に無効化された場合）
        if [ $feature_index -lt ${#features[@]} ]; then
            echo -n "次の機能に進みますか？ (y/n/p[ause]): "
            read -r continue_choice
            if [ "$continue_choice" = "n" ]; then
                echo "実装を中断しました。"
                break
            elif [ "$continue_choice" = "p" ]; then
                echo "一時停止します。続行するにはEnterを押してください..."
                read -r
            fi
        fi
    else
        # 自動実行モード（デフォルト）
        if [ $feature_index -lt ${#features[@]} ]; then
            remaining=$((${#features[@]} - feature_index))
            if [ "$CLAUDEFLOW_QUIET_MODE" != "true" ]; then
                echo -e "${CYAN}→ 自動的に次の機能へ進みます（残り: $remaining 機能）${NC}"
                echo ""
                # 短い遅延を入れて進捗を確認しやすくする
                sleep 2
            fi
        fi
    fi
done

# 最終統合
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}              最終統合フェーズ                    ${NC}"
echo -e "${CYAN}================================================${NC}"

# すべての実装をまとめる
echo -e "${BLUE}全機能の統合中...${NC}"

# 統合前にファイルの存在を確認
final_files_count=$(ls "$IMPLEMENTATION_DIR"/*_final.ts 2>/dev/null | wc -l)
if [ $final_files_count -gt 0 ]; then
    echo -e "${GREEN}  ${final_files_count}個の実装ファイルを統合します${NC}"
    cat "$IMPLEMENTATION_DIR"/*_final.ts > "$IMPLEMENTATION_DIR/integrated_implementation.ts"
    
    # run-pipeline.sh が期待する場所にもコピー
    mkdir -p "$PROJECT_ROOT/implementation"
    cp "$IMPLEMENTATION_DIR/integrated_implementation.ts" "$PROJECT_ROOT/implementation/integrated_implementation.ts"
    
    echo -e "${GREEN}  統合ファイルを作成しました${NC}"
else
    echo -e "${YELLOW}  警告: 実装ファイルが見つかりません${NC}"
    echo "// No final implementation files found" > "$IMPLEMENTATION_DIR/integrated_implementation.ts"
    
    # run-pipeline.sh が期待する場所にもコピー
    mkdir -p "$PROJECT_ROOT/implementation"
    cp "$IMPLEMENTATION_DIR/integrated_implementation.ts" "$PROJECT_ROOT/implementation/integrated_implementation.ts"
fi

# 統合テスト
echo -e "${BLUE}統合テストの生成中...${NC}"
integration_test_prompt="以下の統合された実装に対する統合テストを生成してください：

実装:
$(cat "$IMPLEMENTATION_DIR/integrated_implementation.ts")

重点:
- 機能間の相互作用
- データフロー
- エンドツーエンドシナリオ"

integration_test_response=$(echo "$integration_test_prompt" | claude --print --dangerously-skip-permissions --allowedTools 'Bash Write Edit MultiEdit Read LS Glob Grep')
echo "$integration_test_response" > "$TESTS_DIR/integration_test.ts"

# 最終レポート
if [ "$CLAUDEFLOW_QUIET_MODE" = "true" ]; then
    show_brief_summary "${#selected_indices[@]}" "$processed_count" "$IMPLEMENTATION_LEVEL"
else
    show_implementation_summary "${#selected_indices[@]}" "$processed_count" "$IMPLEMENTATION_LEVEL" "$start_time"
    echo ""
    echo "📊 実装統計:"
    echo "  - 実装機能数: ${#features[@]}"
    echo "  - 総コード行数: $(wc -l < "$IMPLEMENTATION_DIR/integrated_implementation.ts")"
    echo "  - パターン数: $(grep -c "^##" "$PATTERNS_FILE")"
    echo ""
    echo "📁 生成されたファイル:"
    echo "  - 実装: $IMPLEMENTATION_DIR/"
    echo "  - テスト: $TESTS_DIR/"
    echo "  - パターン: $PATTERNS_FILE"
    echo "  - メトリクス: $METRICS_FILE"
    echo ""
    echo "🎯 次のステップ:"
    echo "  1. テストの実行"
    echo "  2. コードレビュー"
fi
echo "  3. デプロイメント準備"