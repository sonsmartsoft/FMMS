import re
with open('web/lib/services/loanService.ts', 'r') as f:
    content = f.read()

# Remove the line `term_months: Number(payload.term_months),` if it's inside `const payload`
def repl(m):
    block = m.group(0)
    lines = block.split('\n')
    new_lines = []
    for line in lines:
        if 'term_months: Number(payload.term_months),' in line:
            continue
        new_lines.append(line)
    return '\n'.join(new_lines)

new_content = re.sub(r'const payload: Record<string, any> = {[^}]+}', repl, content)

with open('web/lib/services/loanService.ts', 'w') as f:
    f.write(new_content)
