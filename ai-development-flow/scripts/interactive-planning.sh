#!/bin/bash

# 対話型プロジェクト企画スクリプト
# 非技術者でも簡単に使えるように設計

set -e

# カラー定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 出力ディレクトリ
OUTPUT_DIR="$(dirname "$0")/../results"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/00_user_input.md"

# ウェルカムメッセージ
clear
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}    AIアプリケーション開発ウィザード    ${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "これから、あなたのアイデアを実際に動くアプリケーションに変換します。"
echo "いくつかの質問に答えていただくだけで、AIが自動的に開発を進めます。"
echo ""
echo -e "${YELLOW}準備はよろしいですか？ (Enter キーを押して開始)${NC}"
read

# ユーザー入力を保存する配列
declare -A user_inputs

# 質問関数
ask_question() {
    local key=$1
    local question=$2
    local example=$3
    local default_value=$4
    
    echo ""
    echo -e "${GREEN}${question}${NC}"
    if [ -n "$example" ]; then
        echo -e "${YELLOW}例: ${example}${NC}"
    fi
    echo -e "${YELLOW}(「スキップ」または「おまかせ」と入力することもできます)${NC}"
    echo -n "> "
    read user_input
    
    # スキップ・おまかせ・デフォルト値の処理
    if [ -z "$user_input" ] || [ "$user_input" = "スキップ" ] || [ "$user_input" = "skip" ] || [ "$user_input" = "おまかせ" ] || [ "$user_input" = "auto" ]; then
        if [ -n "$default_value" ]; then
            user_inputs[$key]="$default_value"
            echo -e "${BLUE}→ AIにおまかせします: $default_value${NC}"
        else
            user_inputs[$key]="AIにおまかせ"
            echo -e "${BLUE}→ AIが最適な内容を決定します${NC}"
        fi
    else
        user_inputs[$key]="$user_input"
    fi
}

# 選択式質問関数
ask_choice() {
    local key=$1
    local question=$2
    shift 2
    local options=("$@")
    local default_option="${options[0]}"  # デフォルトは最初のオプション
    
    echo ""
    echo -e "${GREEN}${question}${NC}"
    
    # オプションを表示
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}"
    done
    
    echo -e "${YELLOW}(「スキップ」または「おまかせ」と入力することもできます)${NC}"
    echo -n "> "
    read choice
    
    # スキップ・おまかせの処理
    if [ -z "$choice" ] || [ "$choice" = "スキップ" ] || [ "$choice" = "skip" ] || [ "$choice" = "おまかせ" ] || [ "$choice" = "auto" ]; then
        user_inputs[$key]="$default_option"
        echo -e "${BLUE}→ AIにおまかせします: $default_option${NC}"
    elif [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
        user_inputs[$key]="${options[$((choice-1))]}"
    else
        # 無効な入力の場合はデフォルトを使用
        user_inputs[$key]="$default_option"
        echo -e "${BLUE}→ デフォルトを選択: $default_option${NC}"
    fi
}

# 複数選択式質問関数
ask_multiple_choice() {
    local key=$1
    local question=$2
    shift 2
    local options=("$@")
    local default_options="ログイン認証, 検索・フィルター機能, モバイル対応"
    
    echo ""
    echo -e "${GREEN}${question}${NC}"
    echo -e "${YELLOW}(複数選択可能。カンマ区切りで番号を入力。例: 1,3,5)${NC}"
    echo -e "${YELLOW}(「スキップ」または「おまかせ」と入力することもできます)${NC}"
    
    # オプションを表示
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}"
    done
    
    echo -n "> "
    read choices
    
    # スキップ・おまかせの処理
    if [ -z "$choices" ] || [ "$choices" = "スキップ" ] || [ "$choices" = "skip" ] || [ "$choices" = "おまかせ" ] || [ "$choices" = "auto" ]; then
        user_inputs[$key]="$default_options"
        echo -e "${BLUE}→ AIにおまかせします: $default_options${NC}"
    else
        # 選択されたオプションを配列に格納
        IFS=',' read -ra selected <<< "$choices"
        local selected_options=""
        
        for choice in "${selected[@]}"; do
            choice=$(echo "$choice" | xargs) # trim whitespace
            if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
                if [ -n "$selected_options" ]; then
                    selected_options+=", "
                fi
                selected_options+="${options[$((choice-1))]}"
            fi
        done
        
        if [ -z "$selected_options" ]; then
            user_inputs[$key]="$default_options"
            echo -e "${BLUE}→ デフォルトを選択: $default_options${NC}"
        else
            user_inputs[$key]="$selected_options"
        fi
    fi
}

# 高速モードの確認
echo -e "\n${BLUE}=== クイックスタート ===${NC}"
echo -e "${GREEN}すべての質問をスキップしてAIにおまかせしますか？${NC}"
echo -e "${YELLOW}(AIが一般的なWebアプリケーションとして自動設計します)${NC}"
echo "  1) はい（AIにすべておまかせ）"
echo "  2) いいえ（質問に答える）"
echo -n "> "
read quick_mode

if [ "$quick_mode" = "1" ] || [ "$quick_mode" = "はい" ] || [ "$quick_mode" = "yes" ]; then
    echo -e "${BLUE}AIにおまかせモードで進めます...${NC}"
    
    # デフォルト値を設定
    user_inputs["app_name"]="AIアプリケーション"
    user_inputs["app_description"]="業務効率化を目的とした汎用的なWebアプリケーション"
    user_inputs["target_users"]="一般的なビジネスユーザー"
    user_inputs["user_count"]="100人程度"
    user_inputs["main_features"]="ユーザー管理、データの作成・編集・削除、検索機能"
    user_inputs["additional_features"]="ログイン認証, 検索・フィルター機能, モバイル対応"
    user_inputs["device_type"]="すべてのデバイス"
    user_inputs["usage_frequency"]="毎日"
    user_inputs["design_priority"]="シンプルで使いやすければ良い"
    user_inputs["design_reference"]="なし"
    user_inputs["data_sensitivity"]="社内情報（中程度）"
    user_inputs["performance_requirement"]="通常の速度で問題ない"
else
    # 質問セクション
    echo -e "\n${BLUE}=== 基本情報 ===${NC}"

    ask_question "app_name" \
        "作りたいアプリケーションの名前を教えてください。" \
        "タスク管理アプリ、在庫管理システム、予約システム など" \
        "AIアプリケーション"

    ask_question "app_description" \
        "このアプリケーションで解決したい問題や実現したいことを教えてください。" \
        "チームのタスクを効率的に管理したい、商品の在庫を正確に把握したい など" \
        "業務効率化を目的とした汎用的なWebアプリケーション"

    echo -e "\n${BLUE}=== ターゲットユーザー ===${NC}"

    ask_question "target_users" \
        "誰がこのアプリケーションを使いますか？" \
        "社内の営業チーム、個人事業主、学生 など" \
        "一般的なビジネスユーザー"

    ask_question "user_count" \
        "想定される利用者数はどのくらいですか？" \
        "10人程度、100人程度、1000人以上 など" \
        "100人程度"

    echo -e "\n${BLUE}=== 主要機能 ===${NC}"

    ask_question "main_features" \
        "必ず必要な機能を3つ程度教えてください。" \
        "ユーザー登録、データの追加・編集・削除、レポート出力 など" \
        "ユーザー管理、データの作成・編集・削除、検索機能"

    ask_multiple_choice "additional_features" \
        "あったら便利な機能を選んでください。" \
        "ログイン認証" \
        "データのエクスポート（CSV/Excel）" \
        "検索・フィルター機能" \
        "通知機能（メール/プッシュ）" \
        "グラフ・チャート表示" \
        "複数言語対応" \
        "モバイル対応" \
        "API連携"

    echo -e "\n${BLUE}=== 使用環境 ===${NC}"

    ask_choice "device_type" \
        "主にどのデバイスで使用しますか？" \
        "デスクトップPC" \
        "タブレット" \
        "スマートフォン" \
        "すべてのデバイス"

    ask_choice "usage_frequency" \
        "どのくらいの頻度で使用しますか？" \
        "毎日" \
        "週に数回" \
        "月に数回" \
        "必要な時だけ"

    echo -e "\n${BLUE}=== デザイン・使いやすさ ===${NC}"

    ask_choice "design_priority" \
        "デザインの優先度を教えてください。" \
        "シンプルで使いやすければ良い" \
        "ある程度見た目も重要" \
        "デザインはとても重要"

    ask_question "design_reference" \
        "参考にしたい既存のアプリやWebサイトがあれば教えてください。（任意）" \
        "Gmail、Slack、Notion など" \
        "なし"

    echo -e "\n${BLUE}=== 技術的な要望（わかる範囲で）===${NC}"

    ask_choice "data_sensitivity" \
        "扱うデータの機密性はどの程度ですか？" \
        "公開情報（機密性なし）" \
        "社内情報（中程度）" \
        "個人情報・機密情報（高い）"

    ask_choice "performance_requirement" \
        "処理速度の要求はどの程度ですか？" \
        "通常の速度で問題ない" \
        "できるだけ速い方が良い" \
        "リアルタイム処理が必要"
fi

# 結果をMarkdownファイルに出力
cat > "$OUTPUT_FILE" << EOF
# プロジェクト企画書（ユーザー入力）

## 基本情報
- **アプリケーション名**: ${user_inputs[app_name]}
- **概要**: ${user_inputs[app_description]}

## ターゲット
- **想定ユーザー**: ${user_inputs[target_users]}
- **想定利用者数**: ${user_inputs[user_count]}

## 機能要件
### 必須機能
${user_inputs[main_features]}

### 追加機能
${user_inputs[additional_features]}

## 使用環境
- **デバイス**: ${user_inputs[device_type]}
- **使用頻度**: ${user_inputs[usage_frequency]}

## デザイン要件
- **優先度**: ${user_inputs[design_priority]}
- **参考**: ${user_inputs[design_reference]:-なし}

## 非機能要件
- **データ機密性**: ${user_inputs[data_sensitivity]}
- **パフォーマンス**: ${user_inputs[performance_requirement]}

---
*このファイルは対話型ウィザードによって自動生成されました。*
EOF

# 完了メッセージ
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✅ 情報の収集が完了しました！${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "入力内容は以下のファイルに保存されました："
echo "$OUTPUT_FILE"
echo ""
echo "これから、AIが以下の作業を自動的に行います："
echo "1. 技術スタックの選定"
echo "2. 要件定義書の作成"
echo "3. プロトタイプの設計"
echo "4. 実際に動くアプリケーションの開発"
echo ""
echo -e "${YELLOW}開発を開始しますか？ (y/n)${NC}"
read -n 1 confirm
echo ""

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}プロジェクトに最適化されたタスクを生成中...${NC}"
    "$(dirname "$0")/generate-tasks.sh" "$OUTPUT_FILE"
    
    echo ""
    echo -e "${GREEN}開発を開始します...${NC}"
    # メインのパイプラインを実行
    "$(dirname "$0")/run-pipeline.sh" "$OUTPUT_FILE"
else
    echo "開発を中止しました。"
    echo "後で開発を開始する場合は、以下のコマンドを実行してください："
    echo "  ./scripts/run-pipeline.sh $OUTPUT_FILE"
fi