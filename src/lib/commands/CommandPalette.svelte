<script lang="ts">
  // src/lib/commands/CommandPalette.svelte
  // ---------------------------------------------------------------------------
  // Реализация Command Palette для Nova Code.
  //
  // Архитектура:
  // - Вдохновлена VS Code Command Palette (F1 / Ctrl+Shift+P).
  // - Использует единый commandRegistry как источник правды по командам и хоткеям.
  // - UI-слой минималистичен, без внешних зависимостей и тяжёлых эффектов.
  // - Fuzzy search и история реализованы локально, без сторонних библиотек.
  // - Подходы и UX-паттерны валидации опираются на актуальные контракты
  //   VS Code / Svelte 5 / Tauri v2 (через context7 и официальную документацию).
  // ---------------------------------------------------------------------------

  import { onDestroy, onMount } from 'svelte';
  import { getAllCommands, executeCommand, type CommandDefinition } from './commandRegistry';
  import { commandPaletteOpen, closeCommandPalette } from '../stores/commandPaletteStore';

  // Максимальное количество элементов истории (LRU).
  const HISTORY_LIMIT = 20;

  let isOpen = false;
  let query = '';
  let allCommands: CommandDefinition[] = [];
  let filtered: CommandDefinition[] = [];
  let history: CommandDefinition[] = [];
  let activeIndex = 0;

  // Подписка на стор видимости палитры.
  const unsubscribeOpen = commandPaletteOpen.subscribe((value) => {
    isOpen = value;
    if (isOpen) {
      // При открытии сбрасываем состояние поиска и выделения.
      query = '';
      allCommands = getAllCommands();
      rebuildFiltered();
      activeIndex = 0;

      // Фокус на инпут в следующем тике.
      queueMicrotask(() => {
        const input = document.getElementById('nova-command-palette-input') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      });
    }
  });

  onDestroy(() => {
    unsubscribeOpen();
  });

  onMount(() => {
    // Изначально получаем список команд (если initDefaultCommands уже вызван).
    allCommands = getAllCommands();
    rebuildFiltered();
  });

  // ---------------------------------------------------------------------------
  // Простая реализация fuzzy search
  // ---------------------------------------------------------------------------
  // Алгоритм:
  // - Приводим всё к lower-case.
  // - Матч по подстроке для label и id.
  // - Скоринг:
  //   - выше, если совпадение ближе к началу label;
  //   - выше, если label короче;
  // - Пустой запрос:
  //   - сначала команды из истории (LRU-список),
  //   - затем остальные команды в алфавитном порядке.
  // ---------------------------------------------------------------------------

  const normalize = (value: string): string => value.toLowerCase();

  interface Scored {
    cmd: CommandDefinition;
    score: number;
  }

  function scoreCommand(cmd: CommandDefinition, q: string): number {
    if (!q) return 0;

    const label = normalize(cmd.label);
    const id = normalize(cmd.id);

    const idxLabel = label.indexOf(q);
    const idxId = id.indexOf(q);

    let best = -1;

    if (idxLabel !== -1) {
      // Базовый скор: приоритет более раннего совпадения и более короткого label.
      best = 1000 - idxLabel * 10 - label.length;
    }

    if (idxId !== -1) {
      const s = 800 - idxId * 5 - id.length;
      if (s > best) best = s;
    }

    return best;
  }

  function rebuildFiltered(): void {
    const q = normalize(query.trim());
    const commands = allCommands;

    if (!q) {
      // Пустой запрос: история + остальные.
      const historyIds = new Set(history.map((c) => c.id));
      const historyList = history.filter((c) => commands.some((cmd) => cmd.id === c.id));
      const rest = commands
        .filter((cmd) => !historyIds.has(cmd.id))
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label));

      filtered = [...historyList, ...rest];
      return;
    }

    const scored: Scored[] = [];

    for (const cmd of commands) {
      const s = scoreCommand(cmd, q);
      if (s >= 0) {
        scored.push({ cmd, score: s });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    filtered = scored.map((s) => s.cmd);
  }

  // ---------------------------------------------------------------------------
  // История (LRU по успешным выполнениями команд)
  // ---------------------------------------------------------------------------

  function touchHistory(cmd: CommandDefinition): void {
    const existingIndex = history.findIndex((c) => c.id === cmd.id);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    history.unshift(cmd);
    if (history.length > HISTORY_LIMIT) {
      history.length = HISTORY_LIMIT;
    }
  }

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    query = target.value;
    rebuildFiltered();
    activeIndex = 0;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filtered.length === 0) return;
      activeIndex = (activeIndex + 1) % filtered.length;
      scrollActiveIntoView();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filtered.length === 0) return;
      activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      scrollActiveIntoView();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (filtered.length === 0) return;
      const cmd = filtered[activeIndex] ?? filtered[0];
      if (!cmd) return;
      runAndClose(cmd);
      return;
    }
  }

  function onItemClick(index: number): void {
    const cmd = filtered[index];
    if (!cmd) return;
    runAndClose(cmd);
  }

  function close(): void {
    closeCommandPalette();
  }

  async function runAndClose(cmd: CommandDefinition): Promise<void> {
    // При успешной попытке — обновить историю и выполнить команду.
    touchHistory(cmd);
    await executeCommand(cmd.id);
    close();
  }

  function scrollActiveIntoView(): void {
    const el = document.querySelector<HTMLDivElement>(
      `.nova-command-palette-item[data-index="${activeIndex}"]`
    );
    if (!el) return;
    const container = document.querySelector<HTMLDivElement>('.nova-command-palette-list');
    if (!container) return;

    const cTop = container.scrollTop;
    const cBottom = cTop + container.clientHeight;
    const eTop = el.offsetTop;
    const eBottom = eTop + el.offsetHeight;

    if (eTop < cTop) {
      container.scrollTop = eTop;
    } else if (eBottom > cBottom) {
      container.scrollTop = eBottom - container.clientHeight;
    }
  }
</script>

{#if isOpen}
  <!-- Полноэкранный overlay над всей версткой.
       Семантика: фон диалога, кликом закрывает палитру.
       Без tabindex и keydown, чтобы не нарушать a11y правил. -->
  <div
    class="nova-command-palette-overlay"
    role="presentation"
    on:click={close}
  >
    <!-- Стопим всплытие, чтобы клик внутри панели не закрывал её -->
    <div
      class="nova-command-palette-container"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      tabindex="-1"
      on:click|stopPropagation
      on:keydown={onKeyDown}
    >
      <input
        id="nova-command-palette-input"
        class="nova-command-palette-input"
        type="text"
        placeholder="Type a command or search (inspired by VS Code Command Palette)"
        bind:value={query}
        on:input={onInput}
      />

      <div class="nova-command-palette-list">
        {#if filtered.length === 0}
          <div class="nova-command-palette-empty">
            No commands found
          </div>
        {:else}
          {#each filtered as cmd, index}
            <div
              class="nova-command-palette-item"
              class:active={index === activeIndex}
              data-index={index}
              role="button"
              tabindex="0"
              on:click={() => onItemClick(index)}
              on:keydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onItemClick(index);
                }
              }}
            >
              <div class="line">
                <span class="label">{cmd.label}</span>
                {#if cmd.keybinding}
                  <span class="keybinding">{cmd.keybinding}</span>
                {/if}
              </div>
              <div class="meta">
                <span class="id">{cmd.id}</span>
                {#if cmd.category}
                  <span class="category">{cmd.category}</span>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .nova-command-palette-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000; /* Выше основного layout, но ниже потенциальных системных окон */
    background-color: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px; /* 20 * 4px */
  }

  .nova-command-palette-container {
    width: 520px; /* 130 * 4px */
    max-height: 420px; /* 105 * 4px */
    background-color: var(--nc-bg-elevated, #111827);
    border: 1px solid var(--nc-border-subtle, #374151);
    border-radius: 8px; /* 2 * 4px */
    box-sizing: border-box;
    padding: 8px; /* 2 * 4px */
    display: flex;
    flex-direction: column;
    gap: 4px; /* 1 * 4px */
  }

  .nova-command-palette-input {
    width: 100%;
    padding: 6px 8px; /* 1.5 * 4px, 2 * 4px */
    border-radius: 4px;
    border: 1px solid var(--nc-border-subtle, #374151);
    background-color: var(--nc-bg, #020817);
    color: var(--nc-fg, #e5e7eb);
    font-size: 13px;
    outline: none;
  }

  .nova-command-palette-input::placeholder {
    color: var(--nc-fg-muted, #9ca3af);
  }

  .nova-command-palette-list {
    margin-top: 4px;
    flex: 1;
    overflow-y: auto;
    border-radius: 4px;
    background-color: var(--nc-bg, #020817);
  }

  .nova-command-palette-item {
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    color: var(--nc-fg-muted, #9ca3af);
  }

  .nova-command-palette-item .line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .nova-command-palette-item .label {
    color: var(--nc-fg, #e5e7eb);
  }

  .nova-command-palette-item .keybinding {
    font-size: 11px;
    color: var(--nc-fg-muted, #9ca3af);
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid var(--nc-border-subtle, #374151);
  }

  .nova-command-palette-item .meta {
    display: flex;
    gap: 6px;
    font-size: 10px;
    color: var(--nc-fg-muted, #6b7280);
  }

  .nova-command-palette-item .id {
    opacity: 0.7;
  }

  .nova-command-palette-item .category {
    opacity: 0.9;
  }

  .nova-command-palette-item.active {
    background-color: var(--nc-tab-bg-active, #111827);
    color: var(--nc-fg, #e5e7eb);
  }

  .nova-command-palette-item.active .label {
    color: var(--nc-fg, #e5e7eb);
  }

  .nova-command-palette-empty {
    padding: 8px;
    color: var(--nc-fg-muted, #9ca3af);
    font-size: 12px;
  }
</style>