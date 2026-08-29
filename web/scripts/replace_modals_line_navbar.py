import os, re

files = ['web/components/layout/Navbar.tsx']

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
                on_close = on_close
            elif '=>' in on_close:
                on_close = f'() => {on_close}'
            
            new_lines.append(f"{' ' * indent}<DraggableModal isOpen={{true}} onClose={{{on_close}}}>\n")
            stack.append(indent)
            
            # skip the next line which is the flex container if it exists
            # Wait, Navbar might not have a flex wrapper separated by a line!
            # It says: className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md"
            # It's ALL IN ONE LINE!
            
            # Let's peek at the next line
            i += 1
            if i < len(lines) and 'className="relative' in lines[i]:
                inner_line = lines[i]
                inner_line = inner_line.replace('w-full', 'w-[90vw] sm:w-[600px]')
                inner_line = inner_line.replace('className="', 'className="cursor-grab active:cursor-grabbing ')
                new_lines.append(inner_line)
            else:
                new_lines.append(lines[i])
        
        elif stack and line.strip() == '</div>' and (len(line) - len(line.lstrip())) == stack[-1]:
            # This is the closing tag of the fixed inset-0 wrapper
            indent = stack.pop()
            new_lines.append(f"{' ' * indent}</DraggableModal>\n")
        else:
            new_lines.append(line)
            
        i += 1

    with open(path, 'w') as f:
        f.writelines(new_lines)

print("Done")
