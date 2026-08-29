import os
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

    # We need to replace `</DraggableModal>` with `</div>\n</DraggableModal>`
    # BUT ONLY if we haven't done it already! 
    # Actually wait. `replace_safe.py` generated EXACTLY:
    # `\n</DraggableModal>\n`
    # Let's just check if there is a `</div>` before it. 
    # If the text immediately before it is not `</div>`, we add it. 
    # But it's easier to just do string replace:
    new_content = content.replace('\n</DraggableModal>\n', '\n</div>\n</DraggableModal>\n')
    
    with open(path, 'w') as f:
        f.write(new_content)

print("Fixed missing closing div")
