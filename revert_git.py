import subprocess
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

for file in files:
    try:
        content = subprocess.check_output(['git', 'show', f'HEAD:{file}'])
        with open(file, 'wb') as f:
            f.write(content)
        print(f"Reverted {file}")
    except Exception as e:
        print(f"Error reverting {file}: {e}")
