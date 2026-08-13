from pathlib import Path
from collections import defaultdict

path = Path('src/pages/common/CommonInteractionLogs.jsx')
text = path.read_text(encoding='utf-8')
balances = {'{': 0, '}': 0, '(': 0, ')': 0}
min_balances = {'{': (999999, 0), '(': (999999, 0)}
line = 1
col = 0
for idx, ch in enumerate(text, 1):
    if ch == '\n':
        line += 1
        col = 0
        continue
    col += 1
    if ch in balances:
        if ch == '{':
            balances['{'] += 1
        elif ch == '}':
            balances['{'] -= 1
            if balances['{'] < min_balances['{'][0]:
                min_balances['{'] = (balances['{'], idx)
        elif ch == '(':
            balances['('] += 1
        elif ch == ')':
            balances['('] -= 1
            if balances['('] < min_balances['('][0]:
                min_balances['('] = (balances['('], idx)

print('final brace', balances['{'])
print('final paren', balances['('])
print('min brace', min_balances['{'])
print('min paren', min_balances['('])

# show context around min positions
for kind, data in [('brace', min_balances['{']), ('paren', min_balances['('])]:
    if data[0] < 0:
        idx = data[1]
        start = max(0, idx - 120)
        end = min(len(text), idx + 120)
        chunk = text[start:end]
        print(f'--- {kind} context at {idx} ---')
        for i, line_text in enumerate(chunk.splitlines(), 1):
            print(f'{start + i:6}: {line_text}')
