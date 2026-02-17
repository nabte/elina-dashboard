from pathlib import Path
path = Path("designer-ai.js")
text = path.read_text(encoding="latin-1")
old = "id: (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)"
new = "id: (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)"
if old not in text:
    raise SystemExit('fallback expression not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='latin-1')
