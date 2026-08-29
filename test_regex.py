import re
text = """        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenAddLoanModal(false)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
"""
pattern = re.compile(
    r'(<div\s+className="fixed\s+inset-0\s+z-\[9999\].*?>)\s*'
    r'(<div\s+className="flex.*?>)\s*'
    r'(<div\s+className="relative\s+rounded-2xl.*?>)'
)
match = pattern.search(text)
print("Match found!" if match else "No match")
