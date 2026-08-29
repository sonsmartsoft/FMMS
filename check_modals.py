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

for f in files:
    if os.path.exists(f):
        with open(f, 'r') as fp:
            content = fp.read()
            c1 = content.count('fixed inset-0')
            c2 = content.count('rgba(0,0,0,0.75)')
            c3 = content.count('DraggableModal')
            print(f"{f}: {c1} fixed, {c2} bg, {c3} DraggableModal")
