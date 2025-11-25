import type * as monacoNamespace from 'monaco-editor';

const registeredLanguages = new Set<string>();

/**
 * Маппинг внутренних ID файлов на ID Monaco.
 * Неизвестные языки остаются как есть, чтобы сохранить текущее поведение.
 */
export function mapLanguageIdToMonaco(languageId: string): string {
  const normalized = languageId.toLowerCase();

  const mapping: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    rs: 'rust',
    py: 'python',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    toml: 'toml',
    yaml: 'yaml',
    yml: 'yaml'
  };

  return mapping[normalized] ?? languageId;
}

/**
 * Регистрирует подсветку для базовых языков через ESM Monaco basic-languages.
 * Возвращает итоговый monaco-language-id (mapLanguageIdToMonaco).
 */
export async function ensureLanguageRegistered(
  monaco: typeof monacoNamespace,
  languageId: string
): Promise<string> {
  const monacoLanguageId = mapLanguageIdToMonaco(languageId);

  if (registeredLanguages.has(monacoLanguageId)) {
    return monacoLanguageId;
  }

  switch (monacoLanguageId) {
    case 'rust': {
      const { language } = await import('monaco-editor/esm/vs/basic-languages/rust/rust');
      monaco.languages.register({ id: 'rust' });
      monaco.languages.setMonarchTokensProvider('rust', language);
      break;
    }
    case 'toml': {
      const { language } = await import('monaco-editor/esm/vs/basic-languages/ini/ini');
      monaco.languages.register({ id: 'toml' });
      monaco.languages.setMonarchTokensProvider('toml', language);
      break;
    }
    case 'python': {
      const { language } = await import('monaco-editor/esm/vs/basic-languages/python/python');
      monaco.languages.register({ id: 'python' });
      monaco.languages.setMonarchTokensProvider('python', language);
      break;
    }
    default:
      // Built-in languages (ts/js/json/html/css/markdown/yaml/plaintext) уже регистрируются Monaco.
      break;
  }

  registeredLanguages.add(monacoLanguageId);
  return monacoLanguageId;
}
