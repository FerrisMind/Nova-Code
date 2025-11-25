// src/lib/editor/EditorCore.ts
// ---------------------------------------------------------------------------
// Легковесное ядро для работы с Monaco Editor в Nova Code.
// Задачи этого модуля:
// - Инкапсулировать прямую работу с monaco.editor.* API.
// - Обеспечить прозрачный, типизированный интерфейс для:
//   - управления моделями (по fileId),
//   - переключения активной модели без потери undo/redo,
//   - базовой конфигурации редактора (theme, tabSize, wrap, minimap, folding и т.п.),
//   - регистрации команд / шорткатов высокого уровня.
// - Не привязывать реализацию к конкретному layout или Tauri.
// - Быть готовым к расширению (diff editor, IntelliSense, кастомные языки).
//
// ВАЖНО:
// - Этот модуль НЕ монтирует DOM: за это отвечает MonacoHost.svelte.
// - Все зависимости на Monaco Editor локализованы здесь.
// - Вызовы опций и API основаны на актуальной документации Monaco Editor
//   (use context7 + официальные docs).
//
// Использование (упрощенно):
// - при монтировании MonacoHost:
//     const core = createEditorCore(monaco);
//     core.attachTo(container);
//     core.setModel({ fileId, uri, value, language });
// - при смене активного файла:
//     core.setModel({ fileId, uri, value, language });
// - при изменении настроек темы/редактора:
//     core.configure({ theme, tabSize, wordWrap, minimap, folding, ... });
//
// Все публичные функции задокументированы TSDoc.

/* eslint-disable @typescript-eslint/no-namespace */

import type * as monacoNamespace from 'monaco-editor';

/**
 * Доступные флаги базовых возможностей редактора.
 */
export interface EditorCapabilities {
  /** Готовность к работе с несколькими моделями (один редактор, много файлов). */
  multiModel: boolean;
  /** Возможность сохранить undo/redo историю при переключении моделей. */
  preserveUndoStackOnSwitch: boolean;
  /** Возможность интеграции diff editor в рамках текущей архитектуры. */
  preparedForDiff: boolean;
  /** Возможность подключения кастомных языков и IntelliSense провайдеров. */
  extensibleLanguages: boolean;
}

/**
 * Базовые опции ядра, отражающие ключевые настройки Monaco.
 * Опирается на актуальные поля IStandaloneEditorConstructionOptions / IEditorOptions.
 */
export interface EditorCoreOptions {
  theme?: string;
  tabSize?: number;
  insertSpaces?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  wordWrapColumn?: number;
  minimap?: {
    enabled: boolean;
    side?: 'right' | 'left';
    renderCharacters?: boolean;
    maxColumn?: number;
    showSlider?: 'always' | 'mouseover';
  };
  folding?: boolean;
  bracketPairColorization?: {
    enabled: boolean;
    independentColorPoolPerBracketType?: boolean;
  };
  readOnly?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontLigatures?: boolean;
  renderWhitespace?: 'selection' | 'boundary' | 'trailing' | 'all' | 'none';
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  codeLens?: boolean;
  links?: boolean;
  largeFileOptimizations?: boolean;
  autoClosingBrackets?: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingQuotes?: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  autoClosingOvertype?: 'always' | 'auto' | 'never';
}

/**
 * Описание модели для файла в редакторе.
 * fileId: ID из editorStore (устойчивая связь с табами / workspace).
 */
export interface EditorModelDescriptor {
  fileId: string;
  uri: string;
  value: string;
  language: string;
}

/**
 * Минимальное представление диагностического сообщения для модели.
 * Обёртка над monaco.editor.IMarkerData.
 */
export interface EditorDiagnostic {
  severity: monacoNamespace.MarkerSeverity | 'error' | 'warning' | 'info' | 'hint';
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  code?: string | number;
}

/**
 * Конфигурация регистрации поддержки языка.
 * Тонкая декларация над monaco.languages.register / registerXXX.
 */
export interface LanguageSupportConfig {
  /** Уникальный идентификатор языка (например, 'typescript', 'json'). */
  id: string;
  /** Расширения файлов для этого языка. */
  extensions?: string[];
  /** Человекочитаемые имена / алиасы. */
  aliases?: string[];
  /**
   * Необязательный lazy-loader (например, для динамической регистрации грамматики).
   * Вызывается один раз при первой активации.
   */
  loader?: () => Promise<unknown>;
}

/**
 * Упрощённая конфигурация completion-провайдера.
 * Обёртка над monaco.languages.registerCompletionItemProvider.
 */
export interface CompletionProviderConfig {
  triggerCharacters?: string[];
  provideCompletionItems: (
    model: monacoNamespace.editor.ITextModel,
    position: monacoNamespace.Position,
    context: monacoNamespace.languages.CompletionContext,
    token: monacoNamespace.CancellationToken
  ) => monacoNamespace.languages.ProviderResult<monacoNamespace.languages.CompletionList>;
}

/**
 * Упрощённая конфигурация hover-провайдера.
 * Обёртка над monaco.languages.registerHoverProvider.
 */
export interface HoverProviderConfig {
  provideHover: (
    model: monacoNamespace.editor.ITextModel,
    position: monacoNamespace.Position,
    token: monacoNamespace.CancellationToken
  ) => monacoNamespace.languages.ProviderResult<monacoNamespace.languages.Hover>;
}

/**
 * Публичное API ядра: минимальный, но полный набор операций,
 * необходимых для интеграции в текущий UI без "магии".
 *
 * Важно:
 * - API надёжно инкапсулирует Monaco, но остаётся прозрачным и предсказуемым.
 * - IntelliSense и diff-режим подключаются через лёгкие обёртки ниже.
 */
export interface EditorCoreApi {
  /** Текущие возможности ядра. */
  readonly capabilities: EditorCapabilities;

  /**
   * Привязать ядро к DOM-контейнеру и создать IStandaloneCodeEditor.
   * Повторный вызов с другим контейнером пересоздаёт редактор.
   */
  attachTo(container: HTMLElement, options?: EditorCoreOptions): void;

  /**
   * Уничтожить редактор и все зарегистрированные модели,
   * не затрагивая внешнее состояние (editorStore, workspaceStore).
   */
  dispose(): void;

  /**
   * Создать (или получить существующую) модель для fileId и
   * установить её активной в редакторе, не теряя undo/redo.
   *
   * - Если модель уже есть, только переключаемся.
   * - Если нет, создаём через monaco.editor.createModel.
   */
  setModel(descriptor: EditorModelDescriptor): void;

  /**
   * Обновить содержимое модели по fileId без переключения активной модели.
   * Нужен для синхронизации внешнего состояния (например, загрузки с диска).
   */
  updateContent(fileId: string, newContent: string): void;

  /**
   * Получить актуальное значение модели по fileId (если существует).
   * Если модель не найдена, вернуть null.
   */
  getModelValue(fileId: string): string | null;

  /**
   * Получить значение активной модели (если есть).
   */
  getActiveModelValue(): string | null;

  /**
   * Применить конфигурацию редактора. Обёртка над editor.updateOptions
   * и monaco.editor.setTheme.
   */
  configure(options: EditorCoreOptions): void;

  /**
   * Зарегистрировать поддержку языка.
   * Не создаёт тяжёлой логики, только делегирует в monaco.languages.register.
   */
  registerLanguageSupport(config: LanguageSupportConfig): void;

  /**
   * Зарегистрировать completion-провайдера для языка.
   * Возвращает disposable для ручного управления при необходимости.
   */
  registerCompletionProvider(
    languageId: string,
    provider: CompletionProviderConfig
  ): monacoNamespace.IDisposable | null;

  /**
   * Зарегистрировать hover-провайдера для языка.
   * Возвращает disposable для ручного управления при необходимости.
   */
  registerHoverProvider(
    languageId: string,
    provider: HoverProviderConfig
  ): monacoNamespace.IDisposable | null;

  /**
   * Установить диагностические сообщения (markers) для модели по fileId.
   * Тонкая обёртка над monaco.editor.setModelMarkers.
   */
  setDiagnostics(fileId: string, diagnostics: EditorDiagnostic[]): void;

  /**
   * Создать diff-сессию на базе существующих моделей.
   * Не владеет жизненным циклом моделей, только diffEditor.
   */
  createDiffSession(params: {
    originalFileId: string;
    modifiedFileId: string;
    options?: {
      renderSideBySide?: boolean;
      readOnlyLeft?: boolean;
      ignoreTrimWhitespace?: boolean;
    };
  }): {
    mount(container: HTMLElement): monacoNamespace.editor.IStandaloneDiffEditor;
    updateOptions(options: {
      renderSideBySide?: boolean;
      readOnlyLeft?: boolean;
      ignoreTrimWhitespace?: boolean;
    }): void;
    dispose(): void;
  };

  /**
   * Зарегистрировать/вызвать базовые команды редактирования через editor.trigger.
   * Это тонкий слой над встроенными Monaco actions.
   *
   * Примеры command:
   * - 'undo'
   * - 'redo'
   * - 'editor.action.commentLine'
   * - 'editor.action.formatDocument'
   * - 'actions.find'
   */
  triggerCommand(source: string, commandId: string, payload?: unknown): void;

  /**
   * Подписаться на изменения содержимого активной модели.
   * Колбэк вызывается при изменении модели, которая сейчас активна в editor.
   * Возвращает функцию отписки.
   */
  onDidChangeContent(listener: (fileId: string, value: string) => void): () => void;

  /**
   * Подписаться на изменение позиции курсора в активном редакторе.
   * Контракт:
   * - fileId: текущий activeFileId (по EditorCore),
   * - lineNumber/column: координаты курсора из Monaco.
   *
   * API спроектирован специально под Status Bar и следует контрактам VS Code/Monaco.
   */
  onDidChangeCursorPosition(
    listener: (payload: { fileId: string; lineNumber: number; column: number }) => void
  ): () => void;

  /**
   * Получить мета-информацию о модели по fileId:
   * - languageId — ID языка модели (из Monaco);
   * - eol — 'LF' | 'CRLF' по текущему EOL модели;
   * - tabSize / insertSpaces — актуальные параметры форматирования.
   *
   * Используется Status Bar, вдохновлено API Monaco/VS Code.
   */
  getModelMetadata(fileId: string): {
    languageId: string;
    eol: 'LF' | 'CRLF';
    tabSize: number;
    insertSpaces: boolean;
  } | null;

  /**
   * Возвращает fileId для модели по её URI.
   */
  getFileIdByUri(uri: string): string | null;
}

/**
 * Внутреннее состояние EditorCore.
 */
interface CoreState {
  monaco: typeof monacoNamespace | null;
  editor: monacoNamespace.editor.IStandaloneCodeEditor | null;
  models: Map<string, monacoNamespace.editor.ITextModel>;
  activeFileId: string | null;
  options: EditorCoreOptions;

  /**
   * Слушатели изменений содержимого активной модели.
   */
  contentListeners: Set<(fileId: string, value: string) => void>;
  contentSubscription: monacoNamespace.IDisposable | null;

  /**
   * Слушатели изменения позиции курсора.
   * Хранятся на уровне Core и работают только при наличии activeFileId.
   */
  cursorPositionListeners: Set<
    (payload: { fileId: string; lineNumber: number; column: number }) => void
  >;
  cursorPositionSubscription: monacoNamespace.IDisposable | null;
}

/**
 * Фабрика ядра редактора.
 * Вызывается один раз на инстанс MonacoHost.svelte.
 */
/**
 * Фабрика ядра редактора.
 * Вызывается один раз на инстанс MonacoHost.svelte.
 * 
 * Оптимизации производительности (Monaco Editor ^0.52+, 2025):
 * - automaticLayout: true — ResizeObserver для отслеживания размеров
 * - smoothScrolling: false — отключено для отзывчивости
 * - cursorSmoothCaretAnimation: 'off' — снижение нагрузки на GPU
 * - renderValidationDecorations: 'editable' — валидация только для редактируемых
 * - quickSuggestionsDelay: 10ms — мгновенный отклик (было 100ms)
 */
export function createEditorCore(monaco: typeof monacoNamespace): EditorCoreApi {
  const state: CoreState = {
    monaco,
    editor: null,
    models: new Map(),
    activeFileId: null,
    options: {
      // --- Layout & Display ---
      wordWrap: 'on',
      lineNumbers: 'on',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontLigatures: true,

      // --- Minimap (оптимизировано) ---
      minimap: {
        enabled: true,
        side: 'right',
        renderCharacters: false, // Символы отключены для производительности
        maxColumn: 80,           // Ограничение ширины
        showSlider: 'mouseover', // Слайдер только при наведении
      },

      // --- Code Features ---
      folding: true,
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },

      // --- Editing ---
      tabSize: 2,
      insertSpaces: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoClosingOvertype: 'always',
    },
    contentListeners: new Set(),
    contentSubscription: null,
    cursorPositionListeners: new Set(),
    cursorPositionSubscription: null,
  };

  const capabilities: EditorCapabilities = {
    multiModel: true,
    preserveUndoStackOnSwitch: true,
    preparedForDiff: true,
    extensibleLanguages: true
  };

  const api: EditorCoreApi = {
    capabilities,

    attachTo(container, options) {
      if (!state.monaco) return;

      if (state.editor) {
        if (state.cursorPositionSubscription) {
          state.cursorPositionSubscription.dispose();
          state.cursorPositionSubscription = null;
        }

        state.editor.dispose();
        state.editor = null;
      }

      if (state.contentSubscription) {
        state.contentSubscription.dispose();
        state.contentSubscription = null;
      }

      if (options) {
        state.options = { ...state.options, ...options };
      }

      const {
        minimap,
        bracketPairColorization,
        autoClosingBrackets,
        autoClosingQuotes,
        autoClosingOvertype,
        codeLens,
        links,
        largeFileOptimizations,
        ...editorOptions
      } = state.options;

      // Создаём редактор с оптимизированными настройками производительности
      const constructed = state.monaco.editor.create(container, {
        // --- Model ---
        model: null,

        // --- Layout ---
        automaticLayout: true, // Автоматическое отслеживание размеров

        // --- Text Display ---
        wordWrap: editorOptions.wordWrap ?? 'on',
        fontSize: editorOptions.fontSize ?? 13,
        fontFamily: editorOptions.fontFamily ?? "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: editorOptions.fontLigatures ?? true,
        lineNumbers: editorOptions.lineNumbers ?? 'on',
        renderWhitespace: editorOptions.renderWhitespace ?? 'selection',

        // --- Editing ---
        tabSize: editorOptions.tabSize ?? 2,
        insertSpaces: editorOptions.insertSpaces ?? true,
        readOnly: editorOptions.readOnly ?? false,
        autoClosingBrackets: autoClosingBrackets ?? 'always',
        autoClosingQuotes: autoClosingQuotes ?? 'always',
        autoClosingOvertype: autoClosingOvertype ?? 'always',

        // --- Code Features ---
        folding: state.options.folding ?? true,
        foldingStrategy: 'indentation', // Быстрее чем language-based
        bracketPairColorization: bracketPairColorization ?? { enabled: true },
        codeLens: typeof codeLens === 'undefined' ? true : codeLens,
        links: typeof links === 'undefined' ? true : links,
        largeFileOptimizations: largeFileOptimizations ?? false,

        // --- Minimap ---
        minimap: minimap ?? {
          enabled: true,
          renderCharacters: false,
          maxColumn: 80,
        },

        // --- Performance Optimizations ---
        smoothScrolling: false,           // Отключено для производительности
        cursorSmoothCaretAnimation: 'off', // Плавная анимация курсора отключена
        renderValidationDecorations: 'editable', // Валидация только для редактируемых

        // Quick suggestions с задержкой для снижения нагрузки
        quickSuggestions: {
          other: 'on',
          comments: 'off',
          strings: 'off',
        },
        quickSuggestionsDelay: 10, // ms задержка перед показом подсказок (мгновенно)

        // --- Scrollbar (кастомизация) ---
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          arrowSize: 0,
        },

        // --- Cursor ---
        cursorBlinking: 'smooth',
        cursorStyle: 'line',

      });

      state.editor = constructed;
    },

    dispose() {
      if (state.contentSubscription) {
        state.contentSubscription.dispose();
        state.contentSubscription = null;
      }

      if (state.cursorPositionSubscription) {
        state.cursorPositionSubscription.dispose();
        state.cursorPositionSubscription = null;
      }

      if (state.editor) {
        state.editor.dispose();
        state.editor = null;
      }

      for (const model of state.models.values()) {
        model.dispose();
      }

      state.models.clear();
      state.activeFileId = null;
      state.contentListeners.clear();
      state.cursorPositionListeners.clear();
    },

    setModel(descriptor) {
      if (!state.monaco || !state.editor) return;

      const existing = state.models.get(descriptor.fileId);
      let model: monacoNamespace.editor.ITextModel;

      if (existing) {
        model = existing;
      } else {
        const uri = state.monaco.Uri.parse(descriptor.uri);
        model = state.monaco.editor.createModel(
          descriptor.value,
          descriptor.language,
          uri
        );
        state.models.set(descriptor.fileId, model);
      }

      state.editor.setModel(model);
      state.activeFileId = descriptor.fileId;

      if (state.contentSubscription) {
        state.contentSubscription.dispose();
        state.contentSubscription = null;
      }

      if (state.cursorPositionSubscription) {
        state.cursorPositionSubscription.dispose();
        state.cursorPositionSubscription = null;
      }

      // Подписка строго на активную модель редактора.
      state.contentSubscription = model.onDidChangeContent(() => {
        if (!state.activeFileId) return;
        const currentModel = state.models.get(state.activeFileId);
        if (!currentModel || currentModel !== model) return;
        const value = currentModel.getValue();
        for (const listener of state.contentListeners) {
          listener(state.activeFileId, value);
        }
      });

      // Подписка на изменение позиции курсора для активного редактора.
      if (state.editor) {
        state.cursorPositionSubscription =
          state.editor.onDidChangeCursorPosition((e) => {
            if (!state.activeFileId) return;
            if (state.cursorPositionListeners.size === 0) return;
            const payload = {
              fileId: state.activeFileId,
              lineNumber: e.position.lineNumber,
              column: e.position.column
            };
            for (const listener of state.cursorPositionListeners) {
              listener(payload);
            }
          });
      }
    },

    updateContent(fileId, newContent) {
      const model = state.models.get(fileId);
      if (!model) return;
      model.setValue(newContent);
    },

    getModelValue(fileId) {
      const model = state.models.get(fileId);
      return model ? model.getValue() : null;
    },

    getActiveModelValue() {
      if (!state.activeFileId) return null;
      return api.getModelValue(state.activeFileId);
    },

    configure(options) {
      if (!state.monaco) return;

      state.options = { ...state.options, ...options };

      if (state.editor) {
        const {
          minimap,
          bracketPairColorization,
          ...editorOptions
        } = state.options;

        state.editor.updateOptions({
          wordWrap: editorOptions.wordWrap,
          wordWrapColumn: editorOptions.wordWrapColumn,
          tabSize: editorOptions.tabSize,
          insertSpaces: editorOptions.insertSpaces,
          folding: state.options.folding,
          minimap,
          fontSize: editorOptions.fontSize,
          fontFamily: editorOptions.fontFamily,
          fontLigatures: editorOptions.fontLigatures,
          renderWhitespace: editorOptions.renderWhitespace,
          lineNumbers: editorOptions.lineNumbers,
          bracketPairColorization,
          readOnly: editorOptions.readOnly,
          codeLens: editorOptions.codeLens,
          links: editorOptions.links,
          largeFileOptimizations: editorOptions.largeFileOptimizations
        });
      }
    },

    registerLanguageSupport(config) {
      if (!state.monaco) return;

      const { id, extensions, aliases, loader } = config;

      state.monaco.languages.register({
        id,
        extensions,
        aliases
      });

      if (loader) {
        void loader();
      }
    },

    registerCompletionProvider(languageId, providerConfig) {
      if (!state.monaco) return null;

      const disposable =
        state.monaco.languages.registerCompletionItemProvider(languageId, {
          triggerCharacters: providerConfig.triggerCharacters,
          provideCompletionItems: providerConfig.provideCompletionItems
        });

      return disposable;
    },

    registerHoverProvider(languageId, providerConfig) {
      if (!state.monaco) return null;

      const disposable = state.monaco.languages.registerHoverProvider(
        languageId,
        {
          provideHover: providerConfig.provideHover
        }
      );

      return disposable;
    },

    setDiagnostics(fileId, diagnostics) {
      if (!state.monaco) return;

      const model = state.models.get(fileId);
      if (!model) return;

      const markers = diagnostics.map(
        (d): monacoNamespace.editor.IMarkerData => {
          const severity =
            typeof d.severity === 'number'
              ? d.severity
              : d.severity === 'error'
                ? state.monaco!.MarkerSeverity.Error
                : d.severity === 'warning'
                  ? state.monaco!.MarkerSeverity.Warning
                  : d.severity === 'info'
                    ? state.monaco!.MarkerSeverity.Info
                    : state.monaco!.MarkerSeverity.Hint;

          return {
            severity,
            message: d.message,
            startLineNumber: d.startLineNumber,
            startColumn: d.startColumn,
            endLineNumber: d.endLineNumber,
            endColumn: d.endColumn,
            code: d.code !== undefined ? String(d.code) : undefined
          };
        }
      );

      state.monaco.editor.setModelMarkers(model, 'nova-code', markers);
    },

    createDiffSession({ originalFileId, modifiedFileId, options }) {
      if (!state.monaco) {
        throw new Error('[EditorCore] Monaco is not initialized');
      }

      const getOrCreateModel = (
        fileId: string
      ): monacoNamespace.editor.ITextModel => {
        const existing = state.models.get(fileId);
        if (existing) return existing;

        const uri = state.monaco!.Uri.parse(`file://${fileId}`);
        const model = state.monaco!.editor.createModel(
          '',
          'plaintext',
          uri
        );
        state.models.set(fileId, model);
        return model;
      };

      const originalModel = getOrCreateModel(originalFileId);
      const modifiedModel = getOrCreateModel(modifiedFileId);

      let diffEditor: monacoNamespace.editor.IStandaloneDiffEditor | null =
        null;
      let currentOptions = options ?? {};

      return {
        mount(container: HTMLElement) {
          if (!state.monaco) {
            throw new Error('[EditorCore] Monaco is not initialized');
          }

          if (diffEditor) {
            diffEditor.dispose();
            diffEditor = null;
          }

          const {
            renderSideBySide = true,
            readOnlyLeft = true,
            ignoreTrimWhitespace = false
          } = currentOptions;

          const baseOpts = state.options;

          diffEditor = state.monaco.editor.createDiffEditor(container, {
            renderSideBySide,
            ignoreTrimWhitespace,
            readOnly: false,
            originalEditable: !readOnlyLeft,
            automaticLayout: true,
            wordWrap: baseOpts.wordWrap ?? 'on',
            minimap: baseOpts.minimap,
            folding: baseOpts.folding,
            fontSize: baseOpts.fontSize,
            lineNumbers: baseOpts.lineNumbers,
            enableSplitViewResizing: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              arrowSize: 0
            }
          });

          diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel
          });

          return diffEditor;
        },

        updateOptions(next) {
          currentOptions = { ...currentOptions, ...next };
          if (!diffEditor) return;

          const {
            renderSideBySide,
            readOnlyLeft,
            ignoreTrimWhitespace
          } = currentOptions;

          const updates: monacoNamespace.editor.IDiffEditorOptions = {};

          if (typeof renderSideBySide !== 'undefined') {
            updates.renderSideBySide = renderSideBySide;
          }
          if (typeof ignoreTrimWhitespace !== 'undefined') {
            updates.ignoreTrimWhitespace = ignoreTrimWhitespace;
          }
          if (typeof readOnlyLeft !== 'undefined') {
            updates.originalEditable = !readOnlyLeft;
          }

          diffEditor.updateOptions(updates);
        },

        dispose() {
          if (diffEditor) {
            diffEditor.dispose();
            diffEditor = null;
          }
        }
      };
    },

    triggerCommand(source, commandId, payload) {
      if (!state.editor) return;
      state.editor.trigger(source, commandId, payload);
    },

    onDidChangeContent(listener) {
      state.contentListeners.add(listener);
      return () => {
        state.contentListeners.delete(listener);
      };
    },

    onDidChangeCursorPosition(listener) {
      state.cursorPositionListeners.add(listener);

      return () => {
        state.cursorPositionListeners.delete(listener);
      };
    },

    getModelMetadata(fileId) {
      if (!state.monaco) return null;
      const model = state.models.get(fileId);
      if (!model) return null;

      const languageId = model.getLanguageId();
      const eolString = model.getEOL();
      const eol: 'LF' | 'CRLF' =
        eolString === '\r\n' ? 'CRLF' : 'LF';

      const options = model.getOptions();
      return {
        languageId,
        eol,
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces
      };
    },

    getFileIdByUri(uri) {
      for (const [fileId, model] of state.models.entries()) {
        if (model.uri.toString() === uri) {
          return fileId;
        }
      }
      return null;
    }
  };

  return api;
}
