import os
import re

directories = ['web/app', 'web/components']
files_to_process = []

for root, _, files in os.walk(directories[0]):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.jsx'):
            files_to_process.append(os.path.join(root, f))
for root, _, files in os.walk(directories[1]):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.jsx'):
            files_to_process.append(os.path.join(root, f))

# regex to find the start of the modal
# Match:
# <div className="fixed inset-0 z-[9999]... >
#   <div className="flex min-h-full items-center justify-center ...>
#     <div className="relative ...>
start_pattern = re.compile(
    r'<div\s+className="fixed\s+inset-0\s+z-\[9999\][^>]*>\s*'
    r'<div\s+className="flex\s+min-h-full[^>]*>\s*'
    r'(<div\s+className="relative\s+[^>]*>)',
    re.MULTILINE
)

# For closing tags, it's harder because we just want to replace the last two </div> </div> before }
# Actually, let's just find the start pattern, then use a bracket counting method to find the end of the modal,
# and replace the start with <DraggableModal isOpen={true}> \n <div ...>
# and the end with </DraggableModal>

for file_path in files_to_process:
    with open(file_path, 'r') as f:
        content = f.read()

    if 'z-[9999]' not in content:
        continue
    if 'DraggableModal' not in content and 'fixed inset-0 z-[9999]' in content:
        # Add import
        import_stmt = "import DraggableModal from '@/components/ui/DraggableModal';\n"
        # Find the last import
        import_match = list(re.finditer(r'^import .*;\n', content, re.MULTILINE))
        if import_match:
            last_import = import_match[-1]
            content = content[:last_import.end()] + import_stmt + content[last_import.end():]
        else:
            content = import_stmt + content

    new_content = ""
    idx = 0
    while True:
        match = start_pattern.search(content, idx)
        if not match:
            new_content += content[idx:]
            break
        
        # We found a modal start!
        new_content += content[idx:match.start()]
        
        # Replace the w-full in the inner div so it doesn't span full width if not needed
        # Or just keep it as is, but add max-w if missing. Actually most have max-w.
        inner_div = match.group(1)
        inner_div = inner_div.replace('w-full', 'w-[90vw]')
        
        new_content += "<DraggableModal isOpen={true}>\n" + inner_div
        
        start_idx = match.end()
        # Now find the matching closing </div> </div> </div> for the 3 nested divs.
        # Since we stripped 2 divs, we need to strip 2 closing </div>s.
        # Let's count divs.
        div_count = 1 # for the inner_div
        curr = start_idx
        while curr < len(content):
            next_open = content.find('<div', curr)
            next_close = content.find('</div', curr)
            
            if next_open == -1: next_open = len(content)
            if next_close == -1: break
            
            if next_open < next_close:
                div_count += 1
                curr = next_open + 4
            else:
                div_count -= 1
                curr = next_close + 6
                if div_count == 0:
                    # We reached the closing tag of inner_div.
                    # The next two closing tags should be the wrappers.
                    # Let's verify and skip them.
                    end_inner = curr
                    
                    # find next </div>
                    close2 = content.find('</div>', end_inner)
                    close3 = content.find('</div>', close2 + 6)
                    
                    if close2 != -1 and close3 != -1:
                        new_content += content[start_idx:end_inner] + "\n</DraggableModal>"
                        idx = close3 + 6
                    else:
                        # fallback
                        new_content += content[start_idx:curr]
                        idx = curr
                    break

    with open(file_path, 'w') as f:
        f.write(new_content)

print("Replacement complete.")
