# Minimal User Registration Implementation

最小限のユーザー登録機能の実装です。

## セットアップ

```bash
cd minimal-app
npm install
npm run dev
```

## アクセス

- http://localhost:3000 - ホームページ
- http://localhost:3000/register - ユーザー登録ページ

## 実装内容

- ✅ 基本的なNext.js 14プロジェクト構成
- ✅ インメモリデータベース（簡易実装）
- ✅ ユーザー登録API（/api/auth/register）
- ✅ 登録フォーム（メール、パスワード、名前）
- ✅ 最小限のバリデーション
- ✅ パスワードハッシュ化（bcrypt）
- ✅ セッションCookie設定
- ✅ エラーハンドリング（重複メール等）

## 制限事項

- データはメモリ上に保存（サーバー再起動で消去）
- 認証機能は未実装（ログイン不可）
- スタイリングは最小限
- テストは未実装