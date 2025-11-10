<script lang="ts">
  /**
   * QuickActions.svelte
   * Плавающая панель быстрых действий в нижней части экрана настроек
   * 
   * Функционал:
   * - Сброс всех настроек (с подтверждением)
   * - Экспорт настроек в JSON
   * - Импорт настроек из JSON
   * - Управление профилями
   * 
   * Дизайн: glassmorphism, минималистичный, с иконками
   */
  
  import { createEventDispatcher } from 'svelte';
  import Icon from '$lib/common/Icon.svelte';
  import { getDefaultQuickActions, type QuickAction } from '$lib/settings/quickActions';
  
  const dispatch = createEventDispatcher<{
    action: { actionId: string };
  }>();

  let showConfirmReset = $state(false);
  let isProcessing = $state(false);

  const quickActions = getDefaultQuickActions();

  async function handleAction(actionId: string) {
    if (isProcessing) return;
    
    // Для reset-all показываем подтверждение
    if (actionId === 'reset-all') {
      showConfirmReset = true;
      return;
    }

    isProcessing = true;
    dispatch('action', { actionId });

    try {
      const action = quickActions.find((a: QuickAction) => a.id === actionId);
      if (action) {
        await action.run();
      }
    } catch (error) {
      console.error(`Quick action ${actionId} failed:`, error);
    } finally {
      isProcessing = false;
    }
  }

  async function confirmReset() {
    showConfirmReset = false;
    await handleAction('reset-all');
  }

  function cancelReset() {
    showConfirmReset = false;
  }

  function handleResetOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      cancelReset();
    }
  }

  // Фильтруем действия для отображения в панели
  const mainActions = quickActions.filter((a: QuickAction) =>
    ['export-json', 'import-json', 'profiles-open'].includes(a.id)
  );
</script>

<div class="quick-actions-panel">
  <div class="actions-container">
    {#each mainActions as action}
      <button
        class="action-button"
        onclick={() => handleAction(action.id)}
        disabled={isProcessing}
        title={action.label}
      >
        {#if action.icon}
          <Icon name={action.icon} size={16} />
        {/if}
        <span class="action-label">{action.label}</span>
      </button>
    {/each}

    <div class="divider"></div>

    <button
      class="action-button danger"
      onclick={() => handleAction('reset-all')}
      disabled={isProcessing}
      title="Сбросить все настройки"
    >
      <Icon name="lucide:RotateCcw" size={16} />
      <span class="action-label">Сбросить всё</span>
    </button>
  </div>
</div>

<!-- Модальное окно подтверждения сброса -->
{#if showConfirmReset}
  <div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleResetOverlayClick}
    onkeydown={(e) => e.key === 'Escape' && cancelReset()}
  >
    <div 
      class="modal-content" 
      role="document"
    >
      <h3>Подтвердите сброс</h3>
      <p>Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?</p>
      <p class="warning">Это действие нельзя отменить.</p>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick={cancelReset}>
          Отмена
        </button>
        <button class="btn btn-danger" onclick={confirmReset}>
          Сбросить
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Плавающая панель внизу */
  .quick-actions-panel {
    position: fixed;
    bottom: 0;
    left: 200px;                          /* Отступ от левой навигации */
    right: 0;
    height: 64px;                         /* 16 * 4px */
    background: rgba(var(--nc-bg-rgb, 20, 20, 24), 0.8);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--nc-border, rgba(255, 255, 255, 0.1));
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 24px;                      /* 6 * 4px */
  }

  .actions-container {
    display: flex;
    align-items: center;
    gap: 12px;                            /* 3 * 4px */
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 8px;                             /* 2 * 4px */
    padding: 8px 16px;                    /* 2 * 4px, 4 * 4px */
    border: 1px solid var(--nc-border, rgba(255, 255, 255, 0.1));
    border-radius: 8px;                   /* 2 * 4px */
    background: rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.6);
    color: var(--nc-fg);
    font-size: 14px;                      /* 3.5 * 4px */
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    white-space: nowrap;
  }

  .action-button:hover:not(:disabled) {
    background: rgba(var(--nc-level-2-rgb, 40, 40, 45), 0.8);
    border-color: var(--nc-accent, #007ACC);
    transform: translateY(-1px);
  }

  .action-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button.danger {
    border-color: rgba(239, 68, 68, 0.3);
  }

  .action-button.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.6);
  }

  .action-label {
    font-size: 14px;                      /* 3.5 * 4px */
  }

  .divider {
    width: 1px;
    height: 32px;                         /* 8 * 4px */
    background: var(--nc-border, rgba(255, 255, 255, 0.1));
  }

  /* Модальное окно */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: var(--nc-level-1, #1e1e23);
    border: 1px solid var(--nc-border, rgba(255, 255, 255, 0.1));
    border-radius: 12px;                  /* 3 * 4px */
    padding: 24px;                        /* 6 * 4px */
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.3s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    pointer-events: none;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-content h3 {
    margin: 0 0 12px 0;
    font-size: 20px;                      /* 5 * 4px */
    font-weight: 600;
    color: var(--nc-fg);
  }

  .modal-content p {
    margin: 0 0 12px 0;
    font-size: 14px;                      /* 3.5 * 4px */
    color: var(--nc-fg-muted);
    line-height: 1.5;
  }

  .modal-content .warning {
    color: #ef4444;
    font-weight: 500;
  }

  .modal-actions {
    display: flex;
    gap: 12px;                            /* 3 * 4px */
    margin-top: 20px;                     /* 5 * 4px */
    justify-content: flex-end;
    pointer-events: auto;
  }

  .btn {
    padding: 8px 16px;                    /* 2 * 4px, 4 * 4px */
    border-radius: 8px;                   /* 2 * 4px */
    font-size: 14px;                      /* 3.5 * 4px */
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
  }

  .btn-secondary {
    background: var(--nc-level-2, #28282d);
    color: var(--nc-fg);
    border-color: var(--nc-border, rgba(255, 255, 255, 0.1));
  }

  .btn-secondary:hover {
    background: var(--nc-level-3, #32323a);
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  /* Адаптивность */
  @media (max-width: 1024px) {
    .quick-actions-panel {
      left: 180px;
    }
  }

  @media (max-width: 768px) {
    .quick-actions-panel {
      left: 0;
      padding: 0 12px;
    }

    .action-label {
      display: none;                      /* Показываем только иконки */
    }
  }
</style>
