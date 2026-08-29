import os
for root, dirs, files in os.walk('web/app'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as fp:
                content = fp.read()
                if 'fixed inset-0' in content or 'fixed z-50' in content or 'fixed' in content:
                    print(path)
for root, dirs, files in os.walk('web/components'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as fp:
                content = fp.read()
                if 'fixed inset-0' in content or 'fixed z-50' in content or 'fixed' in content:
                    print(path)
