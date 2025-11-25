import type { EditorCoreOptions } from '../editor/EditorCore';
import { fileService } from '../services/fileService';

export interface FileValidationResult {
  canOpen: boolean;
  reason?: 'too_large' | 'binary';
  warning?: string;
  optimizations?: Partial<EditorCoreOptions>;
}

/**
 * Проверяет файл перед открытием в Monaco: размер и бинарность.
 * Возвращает предупреждение и оптимизации для крупных файлов.
 */
export async function validateFile(path: string): Promise<FileValidationResult> {
  const preview = await readPreview(path);
  const size = preview.size;

  // Явно текстовые/кодовые расширения — не считаем бинарными.
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  const textLikeExtensions = new Set([
    '.txt',
    '.md',
    '.markdown',
    '.json',
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.svelte',
    '.css',
    '.scss',
    '.less',
    '.html',
    '.xml',
    '.yml',
    '.yaml',
    '.toml',
    '.ini',
    '.cfg',
    '.rs',
    '.py',
    '.lua',
    '.go',
    '.rb',
    '.php',
    '.java',
    '.c',
    '.cpp',
    '.h',
    '.hpp'
  ]);

  if (size > 50 * 1024 * 1024) {
    return {
      canOpen: false,
      reason: 'too_large',
      warning: `File is too large (${formatSize(size)}). Maximum supported size is 50 MB.`,
    };
  }

  const isBinary =
    textLikeExtensions.has(ext) ? false : detectBinaryFromBytes(preview.bytes);
  if (isBinary) {
    return {
      canOpen: false,
      reason: 'binary',
      warning: 'Binary files cannot be opened in the text editor.',
    };
  }

  if (size > 10 * 1024 * 1024) {
    return {
      canOpen: true,
      warning: `Large file (${formatSize(size)}). Some features are disabled for performance.`,
      optimizations: {
        largeFileOptimizations: true,
        minimap: { enabled: false },
        folding: false,
        codeLens: false,
        links: false,
      },
    };
  }

  return { canOpen: true };
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Простая эвристика для бинарных файлов: null-байты или высокая доля не ASCII.
 * Для крупных файлов (>10MB) читаем первые ~2KB после проверки размера.
 */
function detectBinaryFromBytes(buffer: Uint8Array): boolean {
  if (buffer.length === 0) return false;

  if (buffer.some((byte: number) => byte === 0x00)) {
    return true;
  }

  const nonAscii = buffer.filter(
    (b: number) => b > 0x7f || (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d)
  ).length;

  return nonAscii / buffer.length > 0.3;
}

async function readPreview(path: string): Promise<{ bytes: Uint8Array; size: number }> {
  // Читаем содержимое как текст (через существующий fileService) и оцениваем размер по UTF-8.
  // Это компромисс для отсутствия прямого fs-модуля в текущей сборке.
  const content = await fileService.readFile(path);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return {
    bytes: bytes.slice(0, Math.min(bytes.length, 2048)),
    size: bytes.length,
  };
}
