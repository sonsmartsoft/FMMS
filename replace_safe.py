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

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        content = f.read()

    if 'z-[9999]' not in content:
        continue

    # Add import
    if 'DraggableModal' not in content:
        imports = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if imports:
            last = imports[-1].end()
            content = content[:last] + "import DraggableModal from '@/components/ui/DraggableModal';\n" + content[last:]

    # Match the start of the modal
    pattern = re.compile(
        r'(<div[^>]*className="fixed\s+inset-0\s+z-\[9999\][^>]*>)\s*'
        r'(<div[^>]*className="flex[^>]*>)\s*'
        r'(<div[^>]*className="relative\s+rounded-2xl[^>]*>)'
    )
    
    # We will find all matches
    offset = 0
    while True:
        match = pattern.search(content, offset)
        if not match:
            break
            
        start_idx = match.start()
        end_idx = match.end()
        
        # We need to find the matching closing tag for the outer div (match.group(1))
        # The outer div starts at match.start(1)
        
        # Bracket matching logic
        div_count = 0
        i = match.start(1)
        
        close_outer_idx = -1
        close_flex_idx = -1
        close_inner_idx = -1
        
        # We are going to parse tags
        # Find all <div and </div
        tag_pattern = re.compile(r'<\s*(/?)\s*div[^>]*>')
        
        for m in tag_pattern.finditer(content, i):
            is_closing = m.group(1) == '/'
            if not is_closing:
                div_count += 1
            else:
                div_count -= 1
                
                if div_count == 2:
                    close_inner_idx = m.start()
                elif div_count == 1:
                    close_flex_idx = m.start()
                elif div_count == 0:
                    close_outer_idx = m.start()
                    close_outer_end = m.end()
                    break
        
        if close_outer_idx != -1 and close_flex_idx != -1 and close_inner_idx != -1:
            # We found the exact bounds!
            
            # Extract onClose
            m_onClick = re.search(r'onClick={\(\)\s*=>\s*([^}]+)}', match.group(1))
            if not m_onClick:
                m_onClick = re.search(r'onClick={([^}]+)}', match.group(1))
            
            on_close = m_onClick.group(1) if m_onClick else '() => {}'
            if '=>' not in on_close and on_close != '() => {}':
                on_close = on_close
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
                
            inner_div = match.group(3)
            inner_div = inner_div.replace('w-full', 'w-[90vw] sm:w-[600px]')
            inner_div = inner_div.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
            
            new_modal = f"<DraggableModal isOpen={{true}} onClose={{{on_close}}}>\n{inner_div}"
            
            # Now we construct the new content
            # Everything up to start_idx + new_modal + content between inner start and inner close + </DraggableModal> + content after outer close
            new_content = content[:start_idx] + new_modal + content[end_idx:close_inner_idx] + "\n</DraggableModal>\n" + content[close_outer_end:]
            
            content = new_content
            # Next iteration starts from start_idx + length of new modal
            offset = start_idx + len(new_modal)
        else:
            offset = end_idx

    with open(path, 'w') as f:
        f.write(content)

print("Replacement complete.")
