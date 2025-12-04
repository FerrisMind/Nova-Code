// src/lib/editor/intellisense.ts
// -----------------------------------------------------------------------------
// Оптимизированный слой IntelliSense для Monaco Editor в Nova Code.
//
// Архитектура:
// - Singleton-инициализация: языковая поддержка регистрируется один раз
// - Ленивая загрузка: тяжёлые провайдеры активируются по требованию
// - Оптимизированные настройки TS/JS для быстрой валидации
//
// Best Practices (Monaco Editor ^0.52+, 2025):
// - setEagerModelSync(true) — синхронизация моделей с TS worker
// - skipLibCheck: true — ускорение компиляции
// - isolatedModules: true — совместимость с ESM bundlers
// - Cancellation tokens в провайдерах для отзывчивости UI
//
// Использование:
// ```typescript
// import { setupBasicLanguageSupport } from './intellisense';
// setupBasicLanguageSupport(monaco); // Вызывается один раз
// ```
// -----------------------------------------------------------------------------

import type * as monacoNamespace from 'monaco-editor';

// -----------------------------------------------------------------------------
// TypeScript Language Service Types
// -----------------------------------------------------------------------------
// Monaco Editor 0.55+ помечает languages.typescript как deprecated в типах,
// но API работает. Используем явную типизацию для обхода проверки.
// -----------------------------------------------------------------------------

interface TypeScriptDefaults {
  setCompilerOptions(options: Record<string, unknown>): void;
  setDiagnosticsOptions(options: Record<string, unknown>): void;
  setEagerModelSync(value: boolean): void;
  addExtraLib(content: string, filePath?: string): monacoNamespace.IDisposable;
}

interface TypeScriptLanguages {
  typescriptDefaults: TypeScriptDefaults;
  javascriptDefaults: TypeScriptDefaults;
  ScriptTarget: { ES2020: number };
  ModuleKind: { ESNext: number };
  ModuleResolutionKind: { NodeJs: number };
}

// -----------------------------------------------------------------------------
// Singleton-флаги инициализации
// -----------------------------------------------------------------------------

let isLanguageSupportInitialized = false;
let isProvidersInitialized = false;

/**
 * Инициализирует базовую поддержку языков Monaco (singleton).
 * Безопасен для множественных вызовов — выполняется только один раз.
 *
 * Конфигурирует:
 * - TypeScript/JavaScript: compiler options, diagnostics, model sync
 * - JSON: schema validation ready
 * - HTML/CSS: встроенные language features
 *
 * @param monaco - Экземпляр Monaco Editor
 */
export function setupBasicLanguageSupport(monaco: typeof monacoNamespace): void {
  // Singleton: пропускаем если уже инициализировано
  if (isLanguageSupportInitialized) {
    return;
  }

  configureTypeScript(monaco);
  configureJavaScript(monaco);
  registerBuiltInLanguages(monaco);

  isLanguageSupportInitialized = true;

  if (import.meta.env.DEV) {
    console.info('[IntelliSense] Language support initialized');
  }
}

/**
 * Получить TypeScript API из Monaco.
 * Monaco 0.55+ помечает API как deprecated в типах, но он работает.
 */
function getTypeScriptAPI(monaco: typeof monacoNamespace): TypeScriptLanguages {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (monaco.languages as any).typescript as TypeScriptLanguages;
}

/**
 * Конфигурация TypeScript language service.
 * Оптимизировано для быстрой валидации и IntelliSense.
 */
function configureTypeScript(monaco: typeof monacoNamespace): void {
  const ts = getTypeScriptAPI(monaco);
  const tsDefaults = ts.typescriptDefaults;

  // Compiler options: современный ES2020+, строгий режим
  tsDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false, // Отключаем проверку JS для производительности
    noEmit: true,
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true, // Пропускаем проверку .d.ts для скорости
    isolatedModules: true, // Быстрее компиляция
  });

  // Diagnostics: включаем семантику, но с оптимизациями
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      // Игнорируем некритичные warnings для чистоты
      7016, // Could not find declaration file
      2307, // Cannot find module (для локальных импортов)
    ],
  });

  // Синхронизация моделей с worker для актуального IntelliSense
  tsDefaults.setEagerModelSync(true);
}

/**
 * Конфигурация JavaScript language service.
 * Облегчённая версия TypeScript конфигурации.
 */
function configureJavaScript(monaco: typeof monacoNamespace): void {
  const ts = getTypeScriptAPI(monaco);
  const jsDefaults = ts.javascriptDefaults;

  jsDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    allowNonTsExtensions: true,
    checkJs: false, // Отключаем type-checking для JS
    noEmit: true,
  });

  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: true, // JS: только синтаксис
    noSyntaxValidation: false,
  });

  jsDefaults.setEagerModelSync(true);
}

/**
 * Регистрация встроенных языков Monaco.
 * JSON/HTML/CSS используют built-in провайдеры.
 */
function registerBuiltInLanguages(monaco: typeof monacoNamespace): void {
  // Явная регистрация для документации и контракта
  const builtInLanguages = [
    { id: 'json', extensions: ['.json', '.jsonc'] },
    { id: 'html', extensions: ['.html', '.htm'] },
    { id: 'css', extensions: ['.css'] },
    { id: 'scss', extensions: ['.scss'] },
    { id: 'less', extensions: ['.less'] },
    { id: 'xml', extensions: ['.xml', '.svg', '.xsl'] },
    { id: 'markdown', extensions: ['.md', '.markdown'] },
    { id: 'yaml', extensions: ['.yml', '.yaml'] },
  ];

  builtInLanguages.forEach((lang) => {
    monaco.languages.register(lang);
  });
}

/**
 * Регистрирует дополнительные IntelliSense провайдеры (singleton).
 * Включает сниппеты и hover-подсказки для распространённых паттернов.
 *
 * Best Practices:
 * - Всегда проверяем cancellation token
 * - Возвращаем пустой результат вместо null для consistency
 * - Используем singleton для предотвращения дублирования
 *
 * @param monaco - Экземпляр Monaco Editor
 */
export function setupDefaultProviders(monaco: typeof monacoNamespace): void {
  // Singleton: пропускаем если уже инициализировано
  if (isProvidersInitialized) {
    return;
  }

  // Регистрируем провайдеры для TS/JS
  registerSnippetProviders(monaco);
  registerHoverProviders(monaco);

  isProvidersInitialized = true;

  if (import.meta.env.DEV) {
    console.info('[IntelliSense] Providers initialized');
  }
}

/**
 * Создаёт completion провайдер со сниппетами для языка.
 */
function registerSnippetProviders(monaco: typeof monacoNamespace): void {
  const snippets = createCommonSnippets(monaco);

  // Регистрируем для TypeScript и JavaScript
  ['typescript', 'javascript'].forEach((languageId) => {
    monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ['.', '$'],
      provideCompletionItems(model, position, _context, token) {
        // Ранний выход при отмене
        if (token.isCancellationRequested) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range: monacoNamespace.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Добавляем range к каждому сниппету
        const suggestions = snippets.map((snippet) => ({
          ...snippet,
          range,
        }));

        return { suggestions };
      },
    });
  });
}

/**
 * Создаёт набор часто используемых сниппетов.
 */
function createCommonSnippets(
  monaco: typeof monacoNamespace
): Array<Omit<monacoNamespace.languages.CompletionItem, 'range'>> {
  return [
    {
      label: 'log',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Console log statement',
      insertText: 'console.log(${1:value});',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '0_log', // Приоритет сортировки
    },
    {
      label: 'error',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Console error statement',
      insertText: 'console.error(${1:error});',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '0_error',
    },
    {
      label: 'fn',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Arrow function',
      insertText: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '1_fn',
    },
    {
      label: 'afn',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Async arrow function',
      insertText: 'const ${1:name} = async (${2:params}) => {\n\t${3}\n};',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '1_afn',
    },
    {
      label: 'trycatch',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Try-catch block',
      insertText: 'try {\n\t${1}\n} catch (${2:error}) {\n\t${3:console.error(error);}\n}',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '2_try',
    },
    {
      label: 'imp',
      kind: monaco.languages.CompletionItemKind.Snippet,
      documentation: 'Import statement',
      insertText: "import { ${2:module} } from '${1:package}';",
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      sortText: '0_imp',
    },
  ];
}

/**
 * Регистрирует hover-провайдеры с документацией.
 */
function registerHoverProviders(monaco: typeof monacoNamespace): void {
  // Hover для TypeScript
  monaco.languages.registerHoverProvider('typescript', {
    provideHover(model, position, token) {
      if (token.isCancellationRequested) {
        return null;
      }

      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // Документация для часто используемых объектов
      const docs = getBuiltInDocs(word.word);
      if (docs) {
        return {
          contents: [{ value: docs }],
        };
      }

      return null;
    },
  });
}

/**
 * Возвращает документацию для встроенных объектов.
 */
function getBuiltInDocs(word: string): string | null {
  const docs: Record<string, string> = {
    console: '**console** — Стандартный объект для вывода отладочной информации в консоль.',
    JSON: '**JSON** — Объект для работы с JSON: `parse()`, `stringify()`.',
    Promise: '**Promise** — Объект для асинхронных операций.',
    async: '**async** — Ключевое слово для объявления асинхронной функции.',
    await: '**await** — Ожидание результата Promise внутри async функции.',
  };

  return docs[word] ?? null;
}

// -----------------------------------------------------------------------------
// Утилиты для расширения IntelliSense
// -----------------------------------------------------------------------------

/**
 * Добавляет кастомные type definitions для TypeScript.
 * Полезно для добавления типов глобальных объектов.
 *
 * @param monaco - Экземпляр Monaco Editor
 * @param definitions - Строка с TypeScript definitions
 * @param filePath - Виртуальный путь к файлу (например, 'global.d.ts')
 */
export function addExtraLibs(
  monaco: typeof monacoNamespace,
  definitions: string,
  filePath: string = 'ts:extra-libs/global.d.ts'
): monacoNamespace.IDisposable {
  const ts = getTypeScriptAPI(monaco);
  return ts.typescriptDefaults.addExtraLib(definitions, filePath);
}
