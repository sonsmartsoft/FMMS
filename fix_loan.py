import re
with open('web/lib/services/loanService.ts', 'r') as f:
    content = f.read()

# Remove duplicate start_date: input.start_date,
def remove_dup(m):
    block = m.group(0)
    lines = block.split('\n')
    seen = set()
    res = []
    for line in lines:
        if 'start_date:' in line:
            if 'start_date' in seen:
                continue
            seen.add('start_date')
        res.append(line)
    return '\n'.join(res)

content = re.sub(r'const payload = {[^}]+}', remove_dup, content)
content = re.sub(r'const newLoan: LoanRow = {[^}]+}', remove_dup, content)

with open('web/lib/services/loanService.ts', 'w') as f:
    f.write(content)
