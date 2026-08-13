from pathlib import Path
lines = Path('src/pages/common/CommonInteractionLogs.jsx').read_text(encoding='utf-8').splitlines()
bal = 0
for i, line in enumerate(lines, 1):
    for ch in line:
        if ch == '{':
            bal += 1
        elif ch == '}':
            bal -= 1
    if 1300 <= i <= 1390:
        print(f'{i:4} bal={bal}: {line}')
print('final', bal)
