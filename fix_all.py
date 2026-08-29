import re, os
files = [
    'web/app/assets/[id]/page.tsx',
    'web/app/fuel/page.tsx',
    'web/app/maintenance/page.tsx',
    'web/app/assets/page.tsx'
]
for p in files:
    if os.path.exists(p):
        with open(p, 'r') as f: content = f.read()
        content = re.sub(
            r'<DraggableModal isOpen={true} onClose={([^}]+)}>\s*\n\s*<div className="flex min-h-full[^>]+>\s*\n\s*<div className="relative',
            r'<DraggableModal isOpen={true} onClose={\1}>\n            <div className="cursor-grab active:cursor-grabbing relative',
            content
        )
        content = re.sub(r'</DraggableModal>\s*</div>\s*\n\s*}\)', r'</DraggableModal>\n      )}', content)
        with open(p, 'w') as f: f.write(content)
