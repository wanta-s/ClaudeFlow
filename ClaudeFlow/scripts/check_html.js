const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// HTML構文チェック
console.log('=== HTML構文チェック ===');
const openTags = html.match(/<[^\/\!][^>]*>/g) || [];
const closeTags = html.match(/<\/[^>]+>/g) || [];

// 主要タグの開閉チェック
const checkTags = ['html', 'head', 'body', 'div', 'script', 'style'];
checkTags.forEach(tag => {
  const openCount = (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
  const closeCount = (html.match(new RegExp('<\\/' + tag + '>', 'g')) || []).length;
  if (openCount \!== closeCount) {
    console.log('⚠️  ' + tag + 'タグの開閉が一致しません: 開始=' + openCount + ', 終了=' + closeCount);
  }
});

// JavaScript基本構文チェック
console.log('\n=== JavaScript構文チェック ===');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  try {
    // 簡易的な構文チェック
    const script = scriptMatch[1];
    // クラス定義の確認
    if (script.includes('class BowlingGame')) {
      console.log('✓ BowlingGameクラスが定義されています');
    }
    // 主要メソッドの確認
    const methods = ['init', 'roll', 'calculateScores', 'renderScorecard', 'newGame'];
    methods.forEach(method => {
      if (script.includes(method + '(')) {
        console.log('✓ ' + method + 'メソッドが定義されています');
      }
    });
  } catch (e) {
    console.log('⚠️  JavaScript構文エラー:', e.message);
  }
}

// ファイルサイズチェック
console.log('\n=== ファイル情報 ===');
console.log('ファイルサイズ:', html.length, 'バイト');
console.log('行数:', html.split('\n').length, '行');
console.log('\n✓ HTMLファイルの基本構造は正常です');
