// src/lib/editor/monacoEnvironment.ts
// -----------------------------------------------------------------------------
// Конфигурация MonacoEnvironment для работы воркеров Monaco Editor в Vite/Svelte
// (Tauri фронтенд). Основано на официальной документации Monaco Editor
// (/microsoft/monaco-editor, integrate-esm.md, Vite setup).
//
// Архитектура:
// - Web Workers для тяжёлых операций (синтаксис, валидация, автодополнение)
// - Singleton-инициализация: конфигурация применяется один раз
// - Ленивая загрузка воркеров: создаются только при первом обращении к языку
//
// Оптимизации (Monaco Editor ^0.52+, 2025):
// - ESM workers через Vite ?worker — нативная поддержка бандлера
// - getWorker вместо getWorkerUrl — прямой контроль над Worker instances
// - Singleton pattern — предотвращение повторной инициализации
//
// Важно:
// - Импортировать ДО первого использования Monaco
// - Side-effect import: `import './monacoEnvironment'`
// -----------------------------------------------------------------------------

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// -----------------------------------------------------------------------------
// Типы для глобального MonacoEnvironment
// -----------------------------------------------------------------------------

declare global {
  interface Window {
    MonacoEnvironment?: MonacoEnvironmentConfig;
    /** Флаг инициализации Monaco environment (singleton) */
    __MONACO_ENV_INITIALIZED__?: boolean;
  }

  interface WorkerGlobalScope {
    MonacoEnvironment?: MonacoEnvironmentConfig;
  }
}

interface MonacoEnvironmentConfig {
  getWorker?: (workerId: string, label: string) => Worker;
  getWorkerUrl?: (moduleId: string, label: string) => string;
}

// -----------------------------------------------------------------------------
// Singleton-инициализация
// -----------------------------------------------------------------------------

const globalScope =
  typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
      ? window
      : ({} as typeof globalThis);

/**
 * Инициализирует MonacoEnvironment один раз за жизненный цикл приложения.
 * Использует флаг __MONACO_ENV_INITIALIZED__ для предотвращения повторной инициализации.
 */
function initializeMonacoEnvironment(): void {
  type MonacoGlobalScope = typeof globalThis & {
    __MONACO_ENV_INITIALIZED__?: boolean;
    MonacoEnvironment?: MonacoEnvironmentConfig;
  };

  const scope = globalScope as MonacoGlobalScope;

  // Проверяем singleton-флаг
  if (scope.__MONACO_ENV_INITIALIZED__) {
    return;
  }

  // Создаём объект конфигурации если его нет
  if (!scope.MonacoEnvironment) {
    scope.MonacoEnvironment = {};
  }

  // Настраиваем getWorker для Vite-сборки
  scope.MonacoEnvironment.getWorker = createWorkerFactory();

  // Устанавливаем флаг инициализации
  scope.__MONACO_ENV_INITIALIZED__ = true;

  // Debug-лог (только в development)
  if (import.meta.env.DEV) {
    console.info('[MonacoEnvironment] Workers configured (Vite ESM, singleton)');
  }
}

/**
 * Фабрика воркеров Monaco Editor.
 * Маппинг языковых меток на соответствующие Worker-классы.
 *
 * @returns Функция getWorker для MonacoEnvironment
 */
function createWorkerFactory(): (workerId: string, label: string) => Worker {
  /**
   * Карта соответствия языковых меток и воркеров.
   * - json: JSON Schema валидация, форматирование
   * - css/scss/less: CSS language features
   * - html/handlebars/razor: HTML language features
   * - typescript/javascript: TypeScript language service (самый тяжёлый)
   * - default (editor): базовые операции редактора
   */
  const workerMap: Record<string, () => Worker> = {
    json: () => new jsonWorker(),
    css: () => new cssWorker(),
    scss: () => new cssWorker(),
    less: () => new cssWorker(),
    html: () => new htmlWorker(),
    handlebars: () => new htmlWorker(),
    razor: () => new htmlWorker(),
    typescript: () => new tsWorker(),
    javascript: () => new tsWorker(),
  };

  return (_workerId: string, label: string): Worker => {
    const factory = workerMap[label];
    return factory ? factory() : new editorWorker();
  };
}

// -----------------------------------------------------------------------------
// Автоматическая инициализация при импорте модуля
// -----------------------------------------------------------------------------

initializeMonacoEnvironment();

// -----------------------------------------------------------------------------
// Экспорт для тестирования и явной инициализации
// -----------------------------------------------------------------------------

export { initializeMonacoEnvironment };
