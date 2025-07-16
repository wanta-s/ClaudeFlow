import re
import html.parser

# HTMLファイルを読み込む
with open('fishinggame.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# HTMLParserを使って構文チェック
class HTMLChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
        self.tag_stack = []
        self.self_closing_tags = {'meta', 'link', 'img', 'br', 'hr', 'input', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'}
        
    def handle_starttag(self, tag, attrs):
        if tag not in self.self_closing_tags:
            self.tag_stack.append((tag, self.getpos()))
    
    def handle_endtag(self, tag):
        if tag not in self.self_closing_tags:
            if not self.tag_stack:
                self.errors.append(f'Line {self.getpos()[0]}: 対応する開きタグがない閉じタグ </{tag}>')
            else:
                expected_tag, start_pos = self.tag_stack.pop()
                if expected_tag \!= tag:
                    self.errors.append(f'Line {self.getpos()[0]}: タグの不一致 - 期待: </{expected_tag}>, 実際: </{tag}>')
    
    def check_unclosed(self):
        if self.tag_stack:
            unclosed = [f'<{tag}> at line {pos[0]}' for tag, pos in self.tag_stack]
            self.errors.append(f'閉じられていないタグ: {", ".join(unclosed)}')

print('=== HTML構文チェック開始 ===\n')

# HTMLチェック実行
checker = HTMLChecker()
try:
    checker.feed(html_content)
    checker.check_unclosed()
    
    if checker.errors:
        print('❌ HTMLエラー:')
        for error in checker.errors:
            print(f'  - {error}')
    else:
        print('✅ HTML構文は正常です')
except Exception as e:
    print(f'❌ パースエラー: {e}')

# 基本的なJavaScript構文チェック
print('\n=== JavaScript基本チェック ===')
script_pattern = re.compile(r'<script[^>]*>(.*?)</script>', re.DOTALL  < /dev/null |  re.IGNORECASE)
scripts = script_pattern.findall(html_content)

if scripts:
    print(f'✅ {len(scripts)}個のscriptタグが見つかりました')
    # 基本的な構文パターンのチェック
    js_errors = []
    for i, script in enumerate(scripts):
        # 未閉じの括弧をチェック
        open_braces = script.count('{')
        close_braces = script.count('}')
        open_parens = script.count('(')
        close_parens = script.count(')')
        open_brackets = script.count('[')
        close_brackets = script.count(']')
        
        if open_braces \!= close_braces:
            js_errors.append(f'Script {i+1}: 中括弧の数が一致しません ({open_braces} vs {close_braces})')
        if open_parens \!= close_parens:
            js_errors.append(f'Script {i+1}: 丸括弧の数が一致しません ({open_parens} vs {close_parens})')
        if open_brackets \!= close_brackets:
            js_errors.append(f'Script {i+1}: 角括弧の数が一致しません ({open_brackets} vs {close_brackets})')
    
    if js_errors:
        print('❌ JavaScript構文の問題:')
        for error in js_errors:
            print(f'  - {error}')
    else:
        print('✅ JavaScript基本構文は正常です')

print('\n=== チェック完了 ===')
