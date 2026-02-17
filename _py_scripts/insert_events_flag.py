from pathlib import Path
path = Path('designer-ai.js')
text = path.read_text(encoding='latin-1')
old = "let isLoading = false;\n\n    // Estado para la nueva herramienta de Headshot"
if old not in text:
    raise SystemExit('state header not found')
new = "let isLoading = false;\n    let eventsBound = false;\n\n    // Estado para la nueva herramienta de Headshot"
text = text.replace(old, new, 1)
path.write_text(text, encoding='latin-1')
