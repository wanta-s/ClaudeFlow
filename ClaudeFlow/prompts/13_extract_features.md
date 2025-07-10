# 機能リスト抽出

要件定義書から実装すべき機能を抽出し、優先順位をつけてリスト化してください。

## 要件定義書
${requirements_content}

## 抽出基準
- 独立して実装可能な単位で分割
- ユーザー価値の高いものを優先
- 技術的な依存関係を考慮

## 出力形式（JSON）
```json
{
  "features": [
    {
      "id": "feature_001",
      "name": "ユーザー認証",
      "description": "ログイン、ログアウト、セッション管理",
      "priority": 1,
      "dependencies": []
    },
    {
      "id": "feature_002", 
      "name": "ユーザープロファイル",
      "description": "プロファイルの表示と編集",
      "priority": 2,
      "dependencies": ["feature_001"]
    }
  ]
}
```