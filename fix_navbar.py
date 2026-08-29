import re

with open('web/components/layout/Navbar.tsx', 'r') as f:
    content = f.read()

# Add import
imports = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
if imports and 'DraggableModal' not in content:
    last = imports[-1].end()
    content = content[:last] + "import DraggableModal from '@/components/ui/DraggableModal';\n" + content[last:]

pattern = re.compile(
    r'(<div\s+className="fixed\s+inset-0\s+z-\[9999\][^>]*>)\s*'
    r'(<div\s+className="relative\s+rounded-2xl\s+w-full[^>]*>)'
)

match = pattern.search(content)
if match:
    start_idx = match.start()
    end_idx = match.end()
    
    # Extract onClose
    m_onClick = re.search(r'onClick={\(\)\s*=>\s*([^}]+)}', match.group(1))
    on_close = m_onClick.group(1) if m_onClick else '() => {}'
    
    inner_div = match.group(2).replace('w-full', 'w-[90vw] sm:w-[600px]')
    inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
    
    new_modal = f"<DraggableModal isOpen={{true}} onClose={{() => {on_close}}}>\n{inner_div}"
    
    # bracket match to find closing div
    div_count = 0
    close_inner_idx = -1
    close_outer_idx = -1
    tag_pattern = re.compile(r'<\s*(/?)\s*div[^>]*>')
    for m in tag_pattern.finditer(content, match.start(1)):
        if m.group(1) != '/':
            div_count += 1
        else:
            div_count -= 1
            if div_count == 1:
                close_inner_idx = m.start()
            elif div_count == 0:
                close_outer_idx = m.start()
                close_outer_end = m.end()
                break
                
    new_content = content[:start_idx] + new_modal + content[end_idx:close_inner_idx] + "\n</DraggableModal>\n" + content[close_outer_end:]
    
    with open('web/components/layout/Navbar.tsx', 'w') as f:
        f.write(new_content)

print("Navbar fixed")
