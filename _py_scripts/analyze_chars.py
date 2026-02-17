from pathlib import Path
text = Path('designer-ai.js').read_text(encoding='utf-8')
chars = sorted({c for c in text if ord(c) > 127})
print(chars)
