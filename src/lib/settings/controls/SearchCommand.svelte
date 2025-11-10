<script lang="ts">
  // src/lib/settings/controls/SearchCommand.svelte
  // ----------------------------------------------------------------------------
  // Минимальный, но рабочий контрол-поисковик по настройкам.
  //
  // Требования subtasks:
  // - Локальный input.
  // - Вызов реального searchSettings(query) из registry.
  // - Отображение результатов без заглушек.
  // - Событие select(result: SettingsSearchResult) при выборе.
  // - Без глобальных хоткеев и полноэкранного оверлея.
  //
  // Реализация опирается на:
  // - [`settings/registry.ts`](src/lib/settings/registry.ts:1)
  // - [`SettingsSearchResult`](src/lib/settings/types.ts:1)
  // - рекомендации Context7 + официальную документацию Svelte 5
  //   по управлению локальным состоянием и событиями.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from 'svelte';
  import { searchSettings } from '$lib/settings/registry';
  import type { SettingsSearchResult } from '$lib/settings/types';

  type SearchCommandProps = {
    placeholder?: string;
    autofocus?: boolean;
    limit?: number;
    compact?: boolean;
  };

  const dispatch = createEventDispatcher<{
    select: SettingsSearchResult;
    search: { query: string; results: SettingsSearchResult[] };
  }>();

  const {
    placeholder = 'Поиск настроек...',
    autofocus = false,
    limit = 20,
    compact = false
  } = $props();

  let query = $state('');
  let results: SettingsSearchResult[] = $state([]);
  let inputElement: HTMLInputElement;

  // Программное управление фокусом для лучшей доступности
  $effect(() => {
    if (autofocus && inputElement) {
      // Небольшая задержка для обеспечения доступности
      setTimeout(() => {
        inputElement.focus();
      }, 100);
    }
  });

  const runSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      results = [];
      dispatch('search', { query: '', results });
      return;
    }

    const next = searchSettings(trimmed, {
      limit
    });

    results = next;
    dispatch('search', { query: trimmed, results });
  };

  const handleInput = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    query = target.value;
    runSearch();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (query.length > 0) {
        event.preventDefault();
        query = '';
        runSearch();
      }
    }
  };

  const handleSelect = (result: SettingsSearchResult) => {
    dispatch('select', result);
  };
</script>

<div class="nc-search-root {compact ? 'compact' : ''}">
  <div class="nc-search-input-wrap">
    <input
      class="nc-search-input"
      type="text"
      bind:value={query}
      bind:this={inputElement}
      placeholder={placeholder}
      oninput={handleInput}
      onkeydown={handleKeydown}
      aria-label="Search settings"
    />
  </div>

  {#if results.length > 0}
    <div class="nc-search-results">
      {#each results as result (result.settingId)}
        <button
          type="button"
          class="nc-search-item"
          onclick={() => handleSelect(result)}
        >
          <div class="nc-search-item-label">
            {result.label}
          </div>
          <div class="nc-search-item-meta">
            <span class="path">{result.sectionId}</span>
            <span class="id">{result.settingId}</span>
          </div>
          {#if result.description}
            <div class="nc-search-item-description">
              {result.description}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {:else if query.trim().length > 0}
    <div class="nc-search-empty">
      Ничего не найдено для "{query.trim()}".
    </div>
  {/if}
</div>

<style>
  .nc-search-root {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 6px 4px;
    border-radius: 8px;
    background:
      radial-gradient(
        circle at top left,
        rgba(79, 70, 229, 0.06),
        transparent
      ),
      rgba(5, 8, 16, 0.98);
    box-shadow:
      0 10px 26px rgba(15, 23, 42, 0.78),
      inset 0 0 0 1px rgba(15, 23, 42, 0.96);
    box-sizing: border-box;
  }

  .nc-search-root.compact {
    padding: 4px 4px 3px;
    gap: 3px;
  }

  .nc-search-input-wrap {
    position: relative;
  }

  .nc-search-input {
    width: 100%;
    padding: 4px 8px;
    padding-left: 8px;
    border-radius: 6px;
    border: 1px solid var(--nc-border-subtle, rgba(75, 85, 99, 0.9));
    background-color: rgba(6, 8, 16, 0.98);
    color: var(--nc-fg, #e5e7eb);
    font-size: 10px;
    outline: none;
    box-sizing: border-box;
    transition:
      border-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      box-shadow 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      background-color 0.16s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .nc-search-input::placeholder {
    color: var(--nc-fg-muted, #6b7280);
    opacity: 0.8;
  }

  .nc-search-input:hover {
    border-color: rgba(129, 140, 248, 0.9);
  }

  .nc-search-input:focus-visible {
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 0 0 1px rgba(79, 70, 229, 0.7),
      0 8px 18px rgba(15, 23, 42, 0.96);
    background-color: rgba(6, 10, 20, 1);
  }

  .nc-search-results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 220px;
    overflow-y: auto;
    margin-top: 2px;
  }

  .nc-search-item {
    width: 100%;
    padding: 4px 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    background-color: transparent;
    color: var(--nc-fg, #e5e7eb);
    display: flex;
    flex-direction: column;
    gap: 1px;
    text-align: left;
    cursor: pointer;
    outline: none;
    font-size: 9px;
    box-sizing: border-box;
    transition:
      background-color 0.14s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      border-color 0.14s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      box-shadow 0.14s cubic-bezier(0.33, 0.02, 0.11, 0.99),
      transform 0.14s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .nc-search-item:hover {
    background-color: rgba(15, 23, 42, 0.98);
    border-color: rgba(129, 140, 248, 0.55);
    box-shadow:
      0 6px 16px rgba(15, 23, 42, 0.9),
      0 0 10px rgba(79, 70, 229, 0.4);
    transform: translateY(-0.5px);
  }

  .nc-search-item:focus-visible {
    border-color: var(--nc-accent, #4f46e5);
    box-shadow:
      0 0 0 1px rgba(191, 219, 254, 0.9),
      0 0 14px rgba(129, 140, 248, 0.96);
  }

  .nc-search-item-label {
    font-weight: 500;
    color: var(--nc-fg, #e5e7eb);
  }

  .nc-search-item-meta {
    display: flex;
    gap: 6px;
    font-size: 7px;
    color: var(--nc-fg-muted, #9ca3af);
  }

  .nc-search-item-meta .path {
    opacity: 0.8;
  }

  .nc-search-item-meta .id {
    opacity: 0.6;
  }

  .nc-search-item-description {
    font-size: 7px;
    color: var(--nc-fg-muted, #9ca3af);
  }

  .nc-search-empty {
    margin-top: 2px;
    font-size: 8px;
    color: var(--nc-fg-muted, #9ca3af);
  }

  .nc-search-results::-webkit-scrollbar {
    width: 4px;
  }

  .nc-search-results::-webkit-scrollbar-thumb {
    background-color: var(--nc-highlight-subtle, rgba(129, 140, 248, 0.4));
    border-radius: 999px;
  }
</style>