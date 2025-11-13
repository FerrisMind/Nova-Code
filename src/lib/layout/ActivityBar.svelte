<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '../common/Icon.svelte';
  import { activityStore, type ActivityId } from '../stores/activityStore';
  import { sidebarViews } from './sidebarRegistry';
  import { layoutState, toggleLeftSidebar } from '../stores/layout/layoutStore';
  import { editorStore } from '../stores/editorStore';

  /**
   * ActivityBar:
   * - строит иконки из sidebarRegistry для position === 'left';
   * - использует activityStore как источник активного id;
   * - управление видимостью левого сайдбара делегировано layoutStore.
   */
  const leftViews = sidebarViews.filter((v) => v.position === 'left');

  const setActive = (id: ActivityId) => {
    if ($activityStore === id) {
      // Повторный клик по активной иконке сворачивает/разворачивает левый сайдбар.
      toggleLeftSidebar();
      return;
    }

    activityStore.setActivity(id);
    if (!$layoutState.leftSidebarVisible) {
      toggleLeftSidebar();
    }
  };

  const handleSettingsClick = () => {
    editorStore.openSettings();
  };
</script>

<div class="activity-bar" class:rounded={!$layoutState.leftSidebarVisible}>
  <div class="activity-items">
    {#each leftViews as view}
      <button
        class="activity-btn"
        class:active={$activityStore === view.id && $layoutState.leftSidebarVisible}
        on:click={() => setActive(view.id as ActivityId)}
        title={view.title}
      >
        <!-- Отладка: явно логируем id/icon в data-* для визуальной проверки -->
        <Icon name={view.icon} size={20} />
      </button>
    {/each}
  </div>

  <div class="activity-bottom">
    <button class="activity-btn profile" title="Account">
      <Icon name="lucide:User" size={18} />
    </button>

    <!-- Нижняя кнопка настроек: lucide-иконка, согласованная с sidebarRegistry -->
    <button
      class="activity-btn settings-bottom"
      title="Settings"
      class:active={$activityStore === 'settings' && $layoutState.leftSidebarVisible}
      on:click={handleSettingsClick}
    >
      <Icon name="lucide:Settings" size={18} />
    </button>
  </div>
</div>

<style>
  .activity-bar {
    width: 48px;                         /* 12 * 4px */
    background-color: var(--nc-level-0);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;                      /* 2 * 4px */
    gap: 4px;                            /* 1 * 4px */
    border-right: 1px solid var(--nc-border-subtle);
    border-radius: 12px 0 0 12px;
    box-sizing: border-box;
  }

  .activity-bar.rounded {
    border-radius: 12px;  /* Rounded for detached state */
  }

  .activity-items {
    display: flex;
    flex-direction: column;
    gap: 4px;                            /* 1 * 4px */
    margin-top: 0;
  }

  .activity-bottom {
    margin-top: auto;
    padding-bottom: 4px;                 /* 1 * 4px */
    display: flex;
    flex-direction: column;
    gap: 4px;                            /* такое же, как между основными иконками */
    align-items: center;
  }

  .activity-btn {
    width: 36px;                         /* 9 * 4px */
    height: 36px;                        /* 9 * 4px */
    border-radius: 8px;                  /* 2 * 4px */
    border: none;
    background: transparent;
    color: var(--nc-fg-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease, transform 0.06s ease;
  }

  .activity-btn:hover {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .activity-btn.active {
    background-color: var(--nc-tab-bg-active);
    color: var(--nc-fg);
  }

  .profile {
    color: var(--nc-fg-muted);
  }
</style>
