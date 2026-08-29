import os, re

files = [
    'web/app/documents/page.tsx',
    'web/app/settings/devices/page.tsx',
    'web/app/settings/master-data/page.tsx',
    'web/app/settings/users/page.tsx',
    'web/app/warranties/page.tsx',
    'web/components/assets/VehicleFinanceOverview.tsx',
    'web/components/dashboard/DisplaySettingsModal.tsx',
    'web/components/home/HomePage.tsx'
]

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        lines = f.readlines()

    if not any('z-[9999]' in line for line in lines):
        continue

    # Add import
    import_added = False
    for i in range(len(lines)):
        if 'DraggableModal' in lines[i]:
            import_added = True
            break
    
    if not import_added:
        last_import = 0
        for i in range(len(lines)):
            if lines[i].startswith('import '):
                last_import = i
        lines.insert(last_import + 1, "import DraggableModal from '@/components/ui/DraggableModal';\n")

    new_lines = []
    i = 0
    stack = []
    
    while i < len(lines):
        line = lines[i]
        
        # Check if line is the start of a modal
        if 'className="fixed inset-0 z-[9999]' in line:
            indent = len(line) - len(line.lstrip())
            
            # Extract onClose from onClick={() => ...}
            m = re.search(r'onClick={\(\)\s*=>\s*([^}]+)}', line)
            if not m:
                m = re.search(r'onClick={([^}]+)}', line)
            
            on_close = m.group(1) if m else '() => {}'
            if '=>' not in on_close and on_close != '() => {}':
                on_close = on_close # It's a function reference like onClose
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
            
            new_lines.append(f"{' ' * indent}<DraggableModal isOpen={{true}} onClose={{{on_close}}}>\n")
            stack.append(indent)
            
            # Skip the next line which is the flex container (might have p-4 or p-6)
            i += 1
            while i < len(lines) and ('className="flex min-h-full' in lines[i] or 'className="flex items-center justify-center' in lines[i]):
                i += 1
                
            if i < len(lines) and 'className="relative' in lines[i]:
                inner_line = lines[i]
                inner_line = inner_line.replace('w-full', 'w-[90vw] sm:w-[600px]')
                inner_line = inner_line.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
                new_lines.append(inner_line)
            else:
                new_lines.append(lines[i])
        
        elif stack and line.strip() == '</div>' and (len(line) - len(line.lstrip())) == stack[-1]:
            # This is the closing tag of the fixed inset-0 wrapper!
            # Since we skipped a flex wrapper, there might be extra </div> right BEFORE this.
            # Pop up to 2 extra </div> if they exist and are indented more than current indent
            popped = 0
            while len(new_lines) > 0 and new_lines[-1].strip() == '</div>' and popped < 2:
                # verify it's just a closing div before removing
                if (len(new_lines[-1]) - len(new_lines[-1].lstrip())) > stack[-1]:
                    new_lines.pop()
                    popped += 1
                else:
                    break
                
            indent = stack.pop()
            new_lines.append(f"{' ' * indent}</DraggableModal>\n")
        else:
            new_lines.append(line)
            
        i += 1

    with open(path, 'w') as f:
        f.writelines(new_lines)

print("Done")
