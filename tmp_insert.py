from pathlib import Path
path = Path('src/lib/mocks/languageIcons.ts')
text = path.read_text(encoding='utf-8')
marker = "  // Vite - purple/yellow #006bff\n  if (filename.includes('vite.config')) {\n    return 'devicon:vite-original colored';\n  }\n\n"
insert = marker + "  const lucideFallbacks: dict[str,str]?\n"  # placeholder
