// src/lib/editor/monacoEnvironment.ts
// -----------------------------------------------------------------------------
// Конфигурация MonacoEnvironment для работы воркеров Monaco Editor в Vite/Svelte
// (Tauri фронтенд). Основано на официальной документации Monaco Editor
// (/microsoft/monaco-editor, integrate-esm.md, Vite setup). use context7.
//
// Диагностика проблемы:
// - В консоли предупреждение:
//     "You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker"
// - Причина: monaco-editor используется как ESM-модуль, но не задан MonacoEnvironment,
//   поэтому Monaco не знает, какие воркеры запускать для editor/json/css/html/ts.
//
// Решение (универсальное для Vite 6 + monaco-editor ^0.54.0):
// - Импортируем ESM-воркеры через ?worker (поддерживается Vite).
// - Определяем глобальный self.MonacoEnvironment.getWorker.
// - Используем label для выбора нужного воркера.
//
// Важно:
// - Этот файл должен быть импортирован ДО первого использования Monaco (до import('monaco-editor')).
//   В нашем проекте мы импортируем его в MonacoHost.svelte и MonacoDiffHost.svelte прямо
//   перед динамическим import('monaco-editor').

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Расширяем глобальный тип, чтобы TS не ругался на MonacoEnvironment.
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker?: (workerId: string, label: string) => Worker;
      getWorkerUrl?: (moduleId: string, label: string) => string;
    };
  }

  interface WorkerGlobalScope {
    MonacoEnvironment?: {
      getWorker?: (workerId: string, label: string) => Worker;
      getWorkerUrl?: (moduleId: string, label: string) => string;
    };
  }

  // Для self в воркерах/главном контексте.
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DedicatedWorkerGlobalScope extends WorkerGlobalScope {}
}

// Универсальный доступ к глобальному объекту (browser / worker).
const globalScope: any =
  typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
    ? window
    : {};

// Настраиваем MonacoEnvironment.getWorker, если он ещё не определён.
if (!globalScope.MonacoEnvironment) {
  globalScope.MonacoEnvironment = {};
}

if (!globalScope.MonacoEnvironment.getWorker) {
  globalScope.MonacoEnvironment.getWorker = (_: string, label: string): Worker => {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  };
}

// Простой лог для валидации конфигурации во время отладки.
// Не будет спамить, так как файл импортируется ограниченным числом host-компонентов.
if (typeof console !== 'undefined') {
  // eslint-disable-next-line no-console
  console.info(
    '[MonacoEnvironment] getWorker configured (Vite + monaco-editor ESM workers)'
  );
}

export {};