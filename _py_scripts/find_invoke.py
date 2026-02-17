from pathlib import Path
import re
text = Path("designer-ai.js").read_text(encoding="latin-1")
for m in re.finditer(r"functions\.invoke", text):
    print(m.start())
