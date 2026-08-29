import os, re

files = [
    'web/app/finance/page.tsx',
    'web/app/assets/[id]/page.tsx',
    'web/app/fuel/page.tsx',
    'web/app/maintenance/page.tsx',
    'web/app/assets/page.tsx'
]

for path in files:
    if not os.path.exists(path): continue
    with open(path, 'r') as f:
        content = f.read()

    # We want to replace exactly:
    # </div>
    # </div>
    # </div>
    # with
    # </div>
    # </DraggableModal>
    # where the indentation of the last </div> is the same as the <DraggableModal
    
    # Actually, a simpler way: just count the number of <DraggableModal> and replace the corresponding number of `</div>\n          </div>\n        </div>` blocks.
    # Wait, the indentation might be different. Let's just use regex for 3 consecutive closing divs.
    # We replaced 2 opening divs with 1 DraggableModal. Thus, there are 2 extra closing divs per DraggableModal.
    
    # We can use regex to find \s*</div>\s*</div>\s*</div> and replace it with \n</div>\n</DraggableModal>
    # But ONLY do this exactly N times, where N is the number of <DraggableModal> tags!
    # No, they must match properly.
    
    # Since I don't want to break the file, let me restore the files from git, and then just write a python script that does BOTH opening and closing at the exact same time by matching the indentation!
