import re
with open('web/app/finance/page.tsx', 'r') as f: content = f.read()
content = re.sub(r'</DraggableModal>\s*</div>\s*\n\s*}\)', r'</DraggableModal>\n      )}', content)
with open('web/app/finance/page.tsx', 'w') as f: f.write(content)
