import os
for root, dirs, files in os.walk('web/app'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as fp:
                if 'z-[9999]' in fp.read():
                    print(path)
for root, dirs, files in os.walk('web/components'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as fp:
                if 'z-[9999]' in fp.read():
                    print(path)
