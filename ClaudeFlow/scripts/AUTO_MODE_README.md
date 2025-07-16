# 自動実行モードについて

## 概要
hybrid-implementation.sh はデフォルトで**自動実行モード**で動作します。
各機能の実装が完了すると、自動的に次の機能へ進みます。

## 使用方法

### 自動実行モード（デフォルト）
```bash
# すべての機能を自動的に実装
./hybrid-implementation.sh requirements.md design.md

# 特定の機能から再開（自動実行）
RESUME_FROM_FEATURE=feature_002 ./hybrid-implementation.sh requirements.md design.md
```

### 確認モード（従来の動作）
```bash
# 各機能実装後に確認プロンプトを表示
AUTO_CONTINUE=false ./hybrid-implementation.sh requirements.md design.md
```

## 実装レベルと自動実行

実装レベルの選択は最初の1回のみです：
- **ラフレベル**: 4ステップ × 機能数を自動実行
- **標準レベル**: 6ステップ × 機能数を自動実行  
- **商用レベル**: 9ステップ × 機能数を自動実行

## 中断方法

- **Ctrl+C**: いつでも安全に中断可能
- 中断後は `RESUME_FROM_FEATURE` で続きから再開できます

## CI/CD での使用例

```yaml
# GitHub Actions の例
- name: Implement features
  run: |
    cd ClaudeFlow/scripts
    # レベル1（ラフ）を自動選択して実行
    echo "1" | ./hybrid-implementation.sh ../requirements.md ../design.md
```

## 進捗表示

自動実行中も進捗が表示されます：
```
================================================
[3/10] feature_003:タスク作成:新しいタスクの作成機能
================================================

✓ feature_003:タスク作成:新しいタスクの作成機能 の実装完了！
→ 自動的に次の機能へ進みます（残り: 7 機能）
```