import os, re

files = [
    'web/app/finance/page.tsx',
    'web/app/assets/[id]/page.tsx',
    'web/app/fuel/page.tsx',
    'web/app/maintenance/page.tsx',
    'web/app/assets/page.tsx'
]

# The regex for open:
# matches the 3 opening divs
open_regex = re.compile(
    r'<div\s+className="fixed\s+inset-0\s+z-\[9999\][^>]*>\s*'
    r'<div\s+className="flex\s+min-h-full[^>]*>\s*'
    r'(<div\s+className="relative\s+[^>]*>)',
    re.MULTILINE
)

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        content = f.read()

    if 'z-[9999]' not in content:
        continue
        
    if 'DraggableModal' not in content:
        imports = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if imports:
            last = imports[-1].end()
            content = content[:last] + "import DraggableModal from '@/components/ui/DraggableModal';\n" + content[last:]

    # Since we can't easily parse closing tags with regex, let's do a trick:
    # Every time we find the open pattern, we'll replace the *next* occurrence of the 3 closing divs
    
    parts = []
    idx = 0
    while True:
        match = open_regex.search(content, idx)
        if not match:
            parts.append(content[idx:])
            break
            
        parts.append(content[idx:match.start()])
        inner_div = match.group(1).replace('w-full', 'w-[90vw]')
        inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
        parts.append(f"<DraggableModal isOpen={{true}}>\n{inner_div}")
        
        idx = match.end()
        
    content = "".join(parts)
    
    # Now replace the 3 closing divs. This is a bit hacky but works if formatted well:
    # </div>\n          </div>\n        </div> -> </div>\n        </DraggableModal>
    # Let's just use regex for 3 closing divs separated only by whitespace
    
    # Wait, 3 closing divs could be anywhere!
    # Let's count them by finding the actual block.
    # Actually, we can just replace:
    #             </div>
    #           </div>
    #         </div>
    # If we do it manually it's safer. Let's just find "          </div>\n        </div>" and replace it if preceded by "</div>".
    # Better yet, let's just use the fact that the outer div had 'fixed inset-0 z-[9999]'.
    
    with open(path, 'w') as f:
        f.write(content)

