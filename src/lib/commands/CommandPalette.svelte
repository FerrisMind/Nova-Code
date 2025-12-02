<script lang="ts">
  // src/lib/commands/CommandPalette.svelte
  // ---------------------------------------------------------------------------
  // Command Palette для Nova Code на базе shadcn-svelte Command.
  //
  // Использует:
  // - shadcn-svelte Command компоненты (bits-ui под капотом)
  // - Встроенный поиск bits-ui
  // - Группировка по категориям (VS Code style)
  // - Draggable функциональность
  // ---------------------------------------------------------------------------

  import { onDestroy, onMount } from 'svelte';
  import * as Command from '$lib/components/ui/command/index.js';
  import { getAllCommands, executeCommand, type CommandDefinition } from './commandRegistry';
  import { commandPaletteOpen, closeCommandPalette } from '../stores/commandPaletteStore';

  // ---------------------------------------------------------------------------
  // Состояние
  // ---------------------------------------------------------------------------

  let isOpen = $state(false);
  let searchValue = $state('');

  // Константы для позиционирования
  const TITLEBAR_HEIGHT = 40;
  const PALETTE_WIDTH = 500;
  const PALETTE_MAX_HEIGHT = 400;
  const SNAP_THRESHOLD = 30; // Зона примагничивания в пикселях

  // Dragging state
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let containerX = $state(0);
  let containerY = $state(TITLEBAR_HEIGHT);

  // Все команды из registry
  let allCommands = $state<CommandDefinition[]>([]);

  // ---------------------------------------------------------------------------
  // Группировка команд по категориям (VS Code style)
  // ---------------------------------------------------------------------------

  const CATEGORY_ORDER = ['View', 'File', 'Editor', 'Preferences', 'Terminal', 'Search', 'Other'] as const;

  interface CommandGroup {
    id: string;
    heading: string;
    commands: CommandDefinition[];
  }

  const groupedCommands = $derived.by(() => {
    const groups: CommandGroup[] = [];
    const commandsByCategory = new Map<string, CommandDefinition[]>();

    for (const cmd of allCommands) {
      const category = cmd.category || 'Other';
      if (!commandsByCategory.has(category)) {
        commandsByCategory.set(category, []);
      }
      commandsByCategory.get(category)!.push(cmd);
    }

    for (const category of CATEGORY_ORDER) {
      const commands = commandsByCategory.get(category);
      if (commands && commands.length > 0) {
        groups.push({
          id: category.toLowerCase(),
          heading: category,
          commands: commands.sort((a, b) => a.label.localeCompare(b.label))
        });
      }
    }

    for (const [category, commands] of commandsByCategory) {
      if (!CATEGORY_ORDER.includes(category as typeof CATEGORY_ORDER[number]) && commands.length > 0) {
        groups.push({
          id: category.toLowerCase(),
          heading: category,
          commands: commands.sort((a, b) => a.label.localeCompare(b.label))
        });
      }
    }

    return groups;
  });

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  async function handleCommandSelect(commandId: string): Promise<void> {
    closeCommandPalette();
    try {
      await executeCommand(commandId);
    } catch (error) {
      console.error(`[CommandPalette] Failed to execute command "${commandId}":`, error);
    }
  }

  function close(): void {
    closeCommandPalette();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  // ---------------------------------------------------------------------------
  // Dragging
  // ---------------------------------------------------------------------------

  function startDrag(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.closest('[data-slot="command-item"]') ||
      target.closest('[data-slot="command-input"]')
    ) {
      return;
    }

    isDragging = true;
    dragStartX = event.clientX - containerX;
    dragStartY = event.clientY - containerY;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  function onDrag(event: MouseEvent): void {
    if (!isDragging) return;
    
    let newX = event.clientX - dragStartX;
    let newY = event.clientY - dragStartY;
    
    // Ограничение по границам окна
    const minX = 0;
    const maxX = window.innerWidth - PALETTE_WIDTH;
    const minY = TITLEBAR_HEIGHT;
    const maxY = window.innerHeight - PALETTE_MAX_HEIGHT;
    
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    
    // Примагничивание к позиции под титлбаром
    if (newY < TITLEBAR_HEIGHT + SNAP_THRESHOLD) {
      newY = TITLEBAR_HEIGHT;
    }
    
    // Примагничивание к центру по горизонтали
    const centerX = (window.innerWidth - PALETTE_WIDTH) / 2;
    if (Math.abs(newX - centerX) < SNAP_THRESHOLD) {
      newX = centerX;
    }
    
    containerX = newX;
    containerY = newY;
  }

  function stopDrag(): void {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    
    // Финальное примагничивание при отпускании
    if (containerY < TITLEBAR_HEIGHT + SNAP_THRESHOLD && containerY > 0) {
      containerY = TITLEBAR_HEIGHT;
    }
    
    const centerX = (window.innerWidth - PALETTE_WIDTH) / 2;
    if (Math.abs(containerX - centerX) < SNAP_THRESHOLD) {
      containerX = centerX;
    }
  }

  // ---------------------------------------------------------------------------
  // Подписки
  // ---------------------------------------------------------------------------

  const unsubscribeOpen = commandPaletteOpen.subscribe((value) => {
    isOpen = value;
    if (isOpen) {
      searchValue = '';
      allCommands = getAllCommands();
      containerX = (window.innerWidth - PALETTE_WIDTH) / 2;
      containerY = TITLEBAR_HEIGHT;

      queueMicrotask(() => {
        const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]');
        if (input) input.focus();
      });
    }
  });

  onDestroy(() => {
    unsubscribeOpen();
  });

  onMount(() => {
    allCommands = getAllCommands();
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="command-palette-overlay"
    role="presentation"
    onclick={close}
    onkeydown={onKeyDown}
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="command-palette-container"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      tabindex="-1"
      style="left: {containerX}px; top: {containerY}px;"
      onclick={(e) => e.stopPropagation()}
      onkeydown={onKeyDown}
      onmousedown={startDrag}
    >
      <Command.Root class="command-root" bind:value={searchValue}>
        <Command.Input placeholder="Type a command or search..." />

        <Command.List>
          <Command.Empty>No commands found</Command.Empty>

          {#each groupedCommands as group (group.id)}
            <Command.Group heading={group.heading}>
              {#each group.commands as cmd (cmd.id)}
                <Command.Item
                  value={`${cmd.id} ${cmd.label}`}
                  onSelect={() => handleCommandSelect(cmd.id)}
                >
                  <span class="command-label">{cmd.label}</span>
                  {#if cmd.keybinding}
                    <Command.Shortcut>{cmd.keybinding}</Command.Shortcut>
                  {/if}
                </Command.Item>
              {/each}
            </Command.Group>
          {/each}
        </Command.List>
      </Command.Root>
    </div>
  </div>
{/if}

<style>
  .command-palette-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background-color: transparent;
  }

  .command-palette-container {
    position: absolute;
    width: 500px;
    max-height: 400px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 16px 70px rgba(0, 0, 0, 0.6);
    background-color: var(--nc-bg-elevated, #1e1e2e);
    border: 1px solid var(--nc-border-subtle, #45475a);
    display: flex;
    flex-direction: column;
  }

  /* Command Root */
  :global(.command-palette-container [data-slot="command"]) {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 400px;
    background-color: var(--nc-bg-elevated, #1e1e2e) !important;
  }

  /* Input Wrapper */
  :global(.command-palette-container [data-slot="command-input-wrapper"]) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--nc-border-subtle, #45475a);
    cursor: move;
    flex-shrink: 0;
    background-color: var(--nc-bg-elevated, #1e1e2e);
  }

  /* Search Icon */
  :global(.command-palette-container [data-slot="command-input-wrapper"] svg) {
    width: 16px;
    height: 16px;
    color: var(--nc-fg-muted, #6c7086);
    flex-shrink: 0;
  }

  /* Input field */
  :global(.command-palette-container [data-slot="command-input"]) {
    flex: 1;
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: var(--nc-fg, #cdd6f4) !important;
    font-size: 14px;
    cursor: text;
  }

  :global(.command-palette-container [data-slot="command-input"]::placeholder) {
    color: var(--nc-fg-muted, #6c7086);
  }

  /* Command List */
  :global(.command-palette-container [data-slot="command-list"]) {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    max-height: 340px;
  }

  /* Command Group */
  :global(.command-palette-container [data-slot="command-group"]) {
    margin-bottom: 4px;
  }

  /* Group Heading */
  :global(.command-palette-container [data-slot="command-group"] [data-command-group-heading]) {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--nc-fg-muted, #6c7086);
    padding: 8px 8px 4px;
    user-select: none;
  }

  /* Command Item */
  :global(.command-palette-container [data-slot="command-item"]) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin: 1px 0;
    border-radius: 4px;
    cursor: pointer;
    color: var(--nc-fg, #cdd6f4);
    font-size: 13px;
  }

  :global(.command-palette-container [data-slot="command-item"][aria-selected="true"]),
  :global(.command-palette-container [data-slot="command-item"]:hover) {
    background-color: var(--nc-accent-soft, rgba(137, 180, 250, 0.15));
  }

  /* Shortcut badge */
  :global(.command-palette-container [data-slot="command-shortcut"]) {
    margin-left: auto;
    font-size: 10px;
    padding: 2px 5px;
    border-radius: 3px;
    background-color: var(--nc-bg, #11111b);
    border: 1px solid var(--nc-border-subtle, #45475a);
    color: var(--nc-fg-muted, #6c7086);
  }

  /* Empty state */
  :global(.command-palette-container [data-slot="command-empty"]) {
    padding: 24px;
    text-align: center;
    color: var(--nc-fg-muted, #6c7086);
    font-size: 13px;
  }

  .command-label {
    flex: 1;
  }
</style>
