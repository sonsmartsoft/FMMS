import re

with open('web/app/finance/page.tsx', 'r') as f:
    content = f.read()

# Fix the first two modals which had blank lines
content = re.sub(
    r'<DraggableModal isOpen={true} onClose={([^}]+)}>\s*\n\s*<div className="flex min-h-full[^>]+>\s*\n\s*<div className="relative rounded-2xl w-full',
    r'<DraggableModal isOpen={true} onClose={\1}>\n            <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px]',
    content
)

# And fix their closing tags
content = re.sub(
    r'</DraggableModal>\s*</div>\s*\n      }\)',
    r'</DraggableModal>\n      )}',
    content
)

with open('web/app/finance/page.tsx', 'w') as f:
    f.write(content)

