import os, re

files = [
    'web/app/finance/page.tsx',
    'web/app/assets/[id]/page.tsx',
    'web/app/fuel/page.tsx',
    'web/app/maintenance/page.tsx',
    'web/app/assets/page.tsx',
    'web/app/documents/page.tsx',
    'web/app/settings/devices/page.tsx',
    'web/app/settings/master-data/page.tsx',
    'web/app/settings/users/page.tsx',
    'web/app/warranties/page.tsx',
    'web/components/assets/VehicleFinanceOverview.tsx',
    'web/components/dashboard/DisplaySettingsModal.tsx',
    'web/components/home/HomePage.tsx',
    'web/components/layout/Navbar.tsx'
]

def find_tag_end(text, start):
    brace_count = 0
    in_quotes = False
    quote_char = None
    for i in range(start, len(text)):
        c = text[i]
        if c in '"\'`':
            if not in_quotes:
                in_quotes = True
                quote_char = c
            elif quote_char == c:
                in_quotes = False
        elif not in_quotes:
            if c == '{':
                brace_count += 1
            elif c == '}':
                brace_count -= 1
            elif c == '>' and brace_count == 0:
                return i
    return -1

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        content = f.read()

    # Find `z-[9999]`
    if 'z-[9999]' not in content:
        continue

    # Add import
    if 'DraggableModal' not in content:
        imports = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if imports:
            last = imports[-1].end()
            content = content[:last] + "import DraggableModal from '@/components/ui/DraggableModal';\n" + content[last:]

    offset = 0
    while True:
        idx1 = content.find('className="fixed inset-0 z-[9999]', offset)
        if idx1 == -1:
            idx1 = content.find('className="fixed z-[9999]', offset) # in case we partially replaced
            if idx1 == -1: break
            # if we already replaced it, it won't have backdrop-blur-md, we can skip
            if 'pointer-events-none' in content[idx1:idx1+100] or 'DraggableModal' in content[offset:idx1]:
                # actually it's safer to just look for fixed inset-0 z-[9999]
                pass
        
        idx1 = content.find('<div className="fixed inset-0 z-[9999]', offset)
        if idx1 == -1:
            idx1 = content.find('<div\n              className="fixed inset-0 z-[9999]', offset)
        
        # let's just find `z-[9999]` and go backwards to `<div`
        z_idx = content.find('z-[9999]', offset)
        if z_idx == -1: break
        
        start1 = content.rfind('<div', offset, z_idx)
        if start1 == -1: 
            offset = z_idx + 8
            continue
            
        end1 = find_tag_end(content, start1)
        if end1 == -1:
            offset = z_idx + 8
            continue
            
        tag1 = content[start1:end1+1]
        if 'inset-0' not in tag1:
            offset = end1 + 1
            continue

        # Check if already DraggableModal
        if 'DraggableModal' in content[start1-30:start1]:
            offset = end1 + 1
            continue
            
        # Find next div (flex)
        start2 = content.find('<div', end1)
        end2 = find_tag_end(content, start2)
        tag2 = content[start2:end2+1]
        
        # Find next div (relative)
        start3 = content.find('<div', end2)
        end3 = find_tag_end(content, start3)
        tag3 = content[start3:end3+1]
        
        if 'relative' not in tag3:
            offset = end3 + 1
            continue
            
        # Bracket matching to find closing tags
        div_count = 0
        close_inner_idx = -1
        close_outer_idx = -1
        
        tag_pattern = re.compile(r'<\s*(/?)\s*div[^>]*>')
        for m in tag_pattern.finditer(content, start1):
            if m.group(1) != '/':
                div_count += 1
            else:
                div_count -= 1
                if div_count == 2:
                    close_inner_idx = m.start()
                elif div_count == 0:
                    close_outer_idx = m.start()
                    close_outer_end = m.end()
                    break
                    
        if close_inner_idx != -1 and close_outer_idx != -1:
            m_onClick = re.search(r'onClick={\(\)\s*=>\s*([^}]+)}', tag1)
            if not m_onClick:
                m_onClick = re.search(r'onClick={([^}]+)}', tag1)
                
            on_close = m_onClick.group(1) if m_onClick else '() => {}'
            if '=>' not in on_close and on_close != '() => {}':
                on_close = on_close
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
                
            inner_div = tag3.replace('w-full', 'w-[90vw] sm:w-[600px]')
            inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
            
            new_modal = f"<DraggableModal isOpen={{true}} onClose={{() => {on_close}}}>\n{inner_div}"
            if '() => () =>' in new_modal:
                new_modal = new_modal.replace('() => () =>', '() =>')
                
            new_content = content[:start1] + new_modal + content[end3+1:close_inner_idx] + "\n</div>\n</DraggableModal>\n" + content[close_outer_end:]
            content = new_content
            offset = start1 + len(new_modal)
        else:
            offset = end3 + 1

    with open(path, 'w') as f:
        f.write(content)

print("Convert modals complete.")
