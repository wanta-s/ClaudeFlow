#!/bin/bash

# 機能選択問題のデバッグスクリプト

echo "=== 機能選択デバッグ ==="

# 共通関数を読み込む
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common-functions.sh"

# 設定
FEATURES_JSON_PATH="../implementation/features.json"

# 機能配列を読み込み
declare -a features
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

echo "読み込まれた機能数: ${#features[@]}"

# コア機能配列を作成
declare -a core_features_array
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
except:
    pass
" 2>/dev/null)

echo "コア機能数: ${#core_features_array[@]}"
echo "コア機能リスト:"
for core_id in "${core_features_array[@]}"; do
    echo "  $core_id"
done

# コア機能のインデックスを特定
declare -a selected_indices
echo ""
echo "コア機能の配列インデックス確認:"
for i in "${!features[@]}"; do
    feature="${features[$i]}"
    if [[ "$feature" =~ ^feature_[0-9]+: ]]; then
        feature_id=$(echo "$feature" | cut -d: -f1)
        feature_name=$(echo "$feature" | cut -d: -f2)
        
        # コア機能かチェック
        is_core=false
        for core_id in "${core_features_array[@]}"; do
            if [ "$core_id" = "$feature_id" ]; then
                is_core=true
                break
            fi
        done
        
        if [ "$is_core" = "true" ]; then
            selected_indices+=("$i")
            echo "  インデックス $i: $feature_id ($feature_name) - CORE"
        else
            echo "  インデックス $i: $feature_id ($feature_name)"
        fi
    fi
done

echo ""
echo "選択されたインデックス: ${selected_indices[*]}"
echo "選択された機能数: ${#selected_indices[@]}"

echo ""
echo "実際に処理される機能:"
for idx in "${selected_indices[@]}"; do
    feature="${features[$idx]}"
    feature_id=$(echo "$feature" | cut -d: -f1)
    feature_name=$(echo "$feature" | cut -d: -f2)
    echo "  [$((idx+1))] $feature_id: $feature_name"
done