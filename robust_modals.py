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

    # Add import if missing
    if 'DraggableModal' not in content and 'z-[9999]' in content:
        imports = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if imports:
            last = imports[-1].end()
            content = content[:last] + "import DraggableModal from '@/components/ui/DraggableModal';\n" + content[last:]

    offset = 0
    while True:
        # Find next popup overlay
        match = re.search(r'<div[^>]*className=[^>]*fixed[^>]*inset-0[^>]*z-\[9999\][^>]*>', content[offset:])
        if not match:
            break
            
        start1 = offset + match.start()
        end1 = offset + match.end() - 1 # index of '>'
        tag1 = content[start1:end1+1]
        
        # Check if there is a middle flex div
        start_next = content.find('<div', end1)
        end_next = find_tag_end(content, start_next)
        tag_next = content[start_next:end_next+1]
        
        has_middle_div = False
        if 'flex min-h-full items-center justify-center' in tag_next or 'flex items-center justify-center p-4' in tag_next:
            if 'rounded-2xl' not in tag_next:
                has_middle_div = True
                
        if has_middle_div:
            start_inner = content.find('<div', end_next)
            end_inner = find_tag_end(content, start_inner)
            tag_inner = content[start_inner:end_inner+1]
        else:
            start_inner = start_next
            end_inner = end_next
            tag_inner = tag_next

        # Now tag_inner is the main popup container (has rounded-2xl).
        # We need to find the closing tags.
        target_inner_count = 2 if has_middle_div else 1
        
        div_count = 0
        close_inner_idx = -1
        close_outer_idx = -1
        close_outer_end = -1
        
        tag_pattern = re.compile(r'<\s*(/?)\s*div[^>]*>')
        for m in tag_pattern.finditer(content, start1):
            if m.group(1) != '/':
                div_count += 1
            else:
                div_count -= 1
                if div_count == target_inner_count:
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
                pass # it's just a function name
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
                
            inner_div = tag_inner.replace('w-full', 'w-[90vw] sm:w-[600px]')
            if 'cursor-grab' not in inner_div:
                inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing relative ')
            elif 'relative' not in inner_div:
                inner_div = inner_div.replace('className="', 'className="relative ')
                
            new_modal = f"<DraggableModal isOpen={{true}} onClose={{() => {on_close}}}>\n{inner_div}"
            if '() => () =>' in new_modal:
                new_modal = new_modal.replace('() => () =>', '() =>')
                
            new_content = content[:start1] + new_modal + content[end_inner+1:close_inner_idx] + "\n</div>\n</DraggableModal>\n" + content[close_outer_end:]
            content = new_content
            offset = start1 + len(new_modal)
        else:
            print(f"Failed to find closing tags in {path}")
            offset = end1 + 1

    with open(path, 'w') as f:
        f.write(content)

print("Robust convert complete.")
