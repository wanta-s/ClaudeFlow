# fishinggame - 企画・要件書

## 1. アプリ概要
ブラウザで遊べるシンプルな魚釣りゲーム。プレイヤーは釣り竿を操作して様々な魚を釣り、スコアを競う。リラックスして楽しめるカジュアルゲームを目指す。

## 2. 主要機能
1. **釣り操作**: マウスクリックで釣り糸を投げ、タイミングよくクリックして魚を釣る
2. **魚の種類**: 5種類の魚（小魚、中魚、大魚、レア魚、ゴミ）がランダムに出現
3. **スコアシステム**: 釣った魚の種類に応じてポイント獲得（小:10点、中:20点、大:50点、レア:100点、ゴミ:-5点）
4. **制限時間**: 60秒のタイムアタック形式
5. **ハイスコア記録**: ローカルストレージに最高得点を保存

## 3. 技術構成
- **HTML5**: ゲーム画面の構造
- **CSS3**: アニメーション効果とレスポンシブデザイン
- **JavaScript**: ゲームロジック（ライブラリ不使用）
- **Canvas API**: 魚と釣り糸の描画

## 4. 画面構成
### メイン画面（1画面完結）
- 上部: スコア表示、残り時間、ハイスコア
- 中央: 海の背景と釣り場（Canvas領域）
- 下部: スタートボタン、リセットボタン
- ゲームオーバー時: ポップアップで結果表示

## 5. データ設計
```javascript
// 魚データ
const fishTypes = [
  { name: "小魚", points: 10, speed: 3, size: 20, color: "#4A90E2", probability: 0.4 },
  { name: "中魚", points: 20, speed: 2, size: 30, color: "#7ED321", probability: 0.3 },
  { name: "大魚", points: 50, speed: 1, size: 40, color: "#F5A623", probability: 0.15 },
  { name: "レア魚", points: 100, speed: 4, size: 35, color: "#BD10E0", probability: 0.05 },
  { name: "ゴミ", points: -5, speed: 1, size: 25, color: "#9B9B9B", probability: 0.1 }
];

// ゲーム状態
const gameState = {
  score: 0,
  timeLeft: 60,
  isPlaying: false,
  highScore: 0
};
```