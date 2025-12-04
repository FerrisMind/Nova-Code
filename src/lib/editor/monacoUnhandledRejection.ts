let isHooked = false;

/**
 * В VS Code cancel-подобные ошибки (reason/name = "Canceled") считаются штатными при dispose.
 * Здесь воспроизводим тот же паттерн: игнорируем только cancellation- причины.
 */
export function silenceMonacoCancellationErrors() {
  if (isHooked || typeof window === 'undefined') return;
  isHooked = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = typeof reason === 'string' ? reason : (reason?.message ?? '');
    const name = reason?.name ?? '';

    const isCanceled =
      name === 'Canceled' ||
      message === 'Canceled' ||
      message === 'cancelled' ||
      (typeof message === 'string' && message.includes('Canceled'));

    if (isCanceled) {
      event.preventDefault();
    }
  });
}
