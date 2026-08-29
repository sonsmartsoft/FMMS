import os, re
for root, _, files in os.walk('web/app'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r') as file: content = file.read()
            if 'DraggableModal' in content:
                # We can't easily revert because we lost the wrapper code.
                # It's better to just fix the syntax!
                pass
