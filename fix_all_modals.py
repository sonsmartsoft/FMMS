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

    while 'fixed inset-0' in content:
        # Find the first one
        idx1 = content.find('<div')
        start1 = -1
        while idx1 != -1:
            end1 = find_tag_end(content, idx1)
            if end1 != -1:
                tag1 = content[idx1:end1+1]
                if 'fixed inset-0' in tag1 or 'fixed' in tag1 and 'z-[9999]' in tag1:
                    start1 = idx1
                    break
            idx1 = content.find('<div', idx1 + 1)
            
        if start1 == -1:
            # Maybe there are no more 'fixed inset-0' divs (could be in comments)
            break
            
        end1 = find_tag_end(content, start1)
        tag1 = content[start1:end1+1]
        
        # Now find the inner `relative` div. It could be the direct child, or the child's child.
        start_inner = content.find('<div', end1)
        end_inner = find_tag_end(content, start_inner)
        tag_inner = content[start_inner:end_inner+1]
        
        is_two_divs = False
        if 'relative' in tag_inner:
            is_two_divs = True
        else:
            # maybe 3 divs
            start_inner = content.find('<div', end_inner)
            end_inner = find_tag_end(content, start_inner)
            tag_inner = content[start_inner:end_inner+1]
            if 'relative' not in tag_inner:
                print(f"Failed to find relative div in {path} at {start1}")
                # Replace 'fixed inset-0' so we don't infinite loop
                content = content[:start1] + '<div className="BROKEN"' + content[start1+4:]
                continue
                
        # We have the outer div (start1) and the inner relative div (start_inner).
        # We need to find their closing tags.
        
        div_count = 0
        close_inner_idx = -1
        close_outer_idx = -1
        tag_pattern = re.compile(r'<\s*(/?)\s*div[^>]*>')
        
        # Target div_count for the relative div is 1 if 2 divs, 2 if 3 divs
        target_inner_count = 1 if is_two_divs else 2
        
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
                on_close = on_close
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
                
            inner_div = tag_inner.replace('w-full', 'w-[90vw] sm:w-[600px]')
            inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
            
            new_modal = f"<DraggableModal isOpen={{true}} onClose={{() => {on_close}}}>\n{inner_div}"
            if '() => () =>' in new_modal:
                new_modal = new_modal.replace('() => () =>', '() =>')
                
            new_content = content[:start1] + new_modal + content[end_inner+1:close_inner_idx] + "\n</div>\n</DraggableModal>\n" + content[close_outer_end:]
            content = new_content
        else:
            print(f"Failed to find closing tags in {path}")
            content = content[:start1] + '<div className="BROKEN"' + content[start1+4:]

    with open(path, 'w') as f:
        f.write(content)

print("Convert modals complete.")
