// src/lib/editor/intellisense.ts
// -----------------------------------------------------------------------------
// Минимальный, переиспользуемый слой поверх Monaco languages API.
// Не привязан к Svelte/Tauri. Используется EditorCore/MonacoHost как тонкая
// интеграция.
//
// Цели:
// - Декларативно включить базовую поддержку популярных языков (JS/TS/JSON/HTML/CSS).
// - Показать, как регистрировать кастомные completion/hover-провайдеры.
// - Не скрывать Monaco API, а только дать чистые хелперы.
//
// Использование:
// - Внутри MonacoHost после загрузки monaco:
//     import { setupBasicLanguageSupport, setupDefaultProviders } from './intellisense';
//     setupBasicLanguageSupport(monaco);
//     setupDefaultProviders(monaco);
//
// - Внутри EditorCore (по желанию):
//     можно вызывать эти функции один раз на инстанс monaco.
//
// Ссылки на основные типы/контракты см. в [src/lib/editor/EditorCore.ts](src/lib/editor/EditorCore.ts).

import type * as monacoNamespace from 'monaco-editor';

/**
 * Регистрирует базовую поддержку языков Monaco, актуальную для большинства IDE-сценариев.
 *
 * Включает:
 * - языки: typescript, javascript, json, html, css;
 * - типичные compiler/diagnostics options для TS/JS.
 *
 * Не создает тяжёлых зависимостей и не вмешивается в пользовательскую конфигурацию.
 */
export function setupBasicLanguageSupport(monaco: typeof monacoNamespace): void {
  // TypeScript / JavaScript defaults (см. официальную документацию Monaco).
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  tsDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    strict: true
  });

  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  tsDefaults.setEagerModelSync(true);

  jsDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true
  });

  jsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });

  jsDefaults.setEagerModelSync(true);

  // JSON / HTML / CSS используют встроенные провайдеры Monaco, здесь
  // достаточно самого факта наличия моноко-ядра. Явная регистрация базовых
  // языков приведена для читаемости и явного контракта.
  monaco.languages.register({ id: 'json' });
  monaco.languages.register({ id: 'html' });
  monaco.languages.register({ id: 'css' });
}

/**
 * Пример/скелет для регистрации кастомных completion/hover провайдеров.
 *
 * Эти провайдеры:
 * - минимальны, не добавляют тяжёлой логики;
 * - демонстрируют использование актуальных API:
 *   - monaco.languages.registerCompletionItemProvider
 *   - monaco.languages.registerHoverProvider
 *
 * Их можно удалить/заменить в production в соответствии с нуждами проекта.
 */
export function setupDefaultProviders(monaco: typeof monacoNamespace): void {
  // Минимальный, но реальный completion-провайдер для TypeScript.
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position, _context, token) {
      if (token.isCancellationRequested) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range: monacoNamespace.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: monacoNamespace.languages.CompletionItem[] = [
        {
          label: 'console.log',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Вставить вызов console.log(...)',
          insertText: 'console.log(${1:value});',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }
      ];

      return { suggestions };
    }
  });

  // Аналогичный провайдер для JavaScript.
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position, _context, token) {
      if (token.isCancellationRequested) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range: monacoNamespace.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: monacoNamespace.languages.CompletionItem[] = [
        {
          label: 'console.log',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Вставить вызов console.log(...)',
          insertText: 'console.log(${1:value});',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }
      ];

      return { suggestions };
    }
  });

  // Простейший hover-провайдер: рабочая подсказка по объекту console.
  monaco.languages.registerHoverProvider('typescript', {
    provideHover(model, position, token) {
      if (token.isCancellationRequested) {
        return null;
      }

      const word = model.getWordAtPosition(position);
      if (!word) return null;

      if (word.word === 'console') {
        return {
          contents: [
            {
              value: '`console` — стандартный объект вывода отладочной информации.'
            }
          ]
        };
      }

      return null;
    }
  });
}