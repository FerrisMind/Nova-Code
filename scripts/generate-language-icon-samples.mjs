import { promises as fs } from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const languageIconsPath = path.join(projectRoot, 'src', 'lib', 'mocks', 'languageIcons.ts');
const outputDir = path.join(projectRoot, 'samples', 'language-icon-examples');

const fileContent = await fs.readFile(languageIconsPath, 'utf-8');

function extractObjectKeys(constName) {
  const regex = new RegExp(`const\\s+${constName}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\};`, 'm');
  const match = fileContent.match(regex);
  if (!match) return [];
  const body = match[1];
  const keyRegex = /'([^']+?)'\s*:/g;
  const keys = new Set();
  let keyMatch;
  while ((keyMatch = keyRegex.exec(body)) !== null) {
    keys.add(keyMatch[1]);
  }
  return Array.from(keys);
}

function extractSetKeys(constName) {
  const regex = new RegExp(
    `const\\s+${constName}[\\s\\S]*?=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\);`,
    'm'
  );
  const match = fileContent.match(regex);
  if (!match) return [];
  const body = match[1];
  const keyRegex = /'([^']+?)'/g;
  const keys = new Set();
  let keyMatch;
  while ((keyMatch = keyRegex.exec(body)) !== null) {
    keys.add(keyMatch[1]);
  }
  return Array.from(keys);
}

const extensionKeys = extractObjectKeys('EXTENSION_TO_DEVICON');
const specialFileKeys = extractObjectKeys('FILENAME_TO_DEVICON');
const lucideFallbackKeys = extractObjectKeys('lucideFallbacks');
const configExtensionKeys = extractSetKeys('CONFIG_FILE_EXTENSIONS');

const extensionSamples = new Set([...extensionKeys, ...lucideFallbackKeys, ...configExtensionKeys]);
const specialSamples = new Set([...specialFileKeys, 'Settings']);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const writeFile = async (filePath, content) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
};

const makeExtensionFileName = (ext) => {
  if (!ext) {
    return 'example';
  }
  return `example.${ext}`;
};

const extensionDir = path.join(outputDir, 'by-extension');
for (const ext of Array.from(extensionSamples).sort((a, b) => a.localeCompare(b))) {
  const fileName = makeExtensionFileName(ext);
  const filePath = path.join(extensionDir, fileName);
  const content = `// Sample file for extension ".${ext}"\\n// Generated for language icon preview\\n`;
  await writeFile(filePath, content);
}

const specialsDir = path.join(outputDir, 'special-names');
for (const name of Array.from(specialSamples).sort((a, b) => a.localeCompare(b))) {
  const safeName = name === '' ? 'unnamed' : name;
  const filePath = path.join(specialsDir, safeName);
  const content = `# Sample file for special name "${name}"\\n`;
  await writeFile(filePath, content);
}

const readmePath = path.join(outputDir, 'README.md');
const readmeContent = [
  '# Language Icon Samples',
  '',
  'Эта папка автоматически сгенерирована скриптом `scripts/generate-language-icon-samples.mjs` и содержит примеры всех типов файлов, перечисленных в `src/lib/mocks/languageIcons.ts`.',
  '',
  '- `by-extension` — файлы-образцы для каждого расширения',
  '- `special-names` — отдельные файлы для специальных имён (Dockerfile, .gitignore и т.д.)',
  '',
].join('\\n');
await writeFile(readmePath, readmeContent);

console.log(`Sample files created in ${outputDir}`);
