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

    def repl(m):
        func = m.group(1)
        if func.startswith('() =>'):
            return m.group(0) # already correct
        
        # If it's a function reference like `handleClose`, keep it. If it has parens `setOpen(false)`, wrap it
        if '(' in func and not func.startswith('()'):
            return f'<DraggableModal isOpen={{true}} onClose={{() => {func}}}>'
        return m.group(0)

    new_content = re.sub(r'<DraggableModal isOpen={true} onClose={([^}]+)}>', repl, content)
    
    with open(path, 'w') as f:
        f.write(new_content)

print("Fixed onClose")
