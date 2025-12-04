<script lang="ts">
  import CheckIcon from '@lucide/svelte/icons/check';
  import { Select as SelectPrimitive } from 'bits-ui';
  import { cn, type WithoutChild } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    value,
    label,
    children: childrenProp,
    ...restProps
  }: WithoutChild<SelectPrimitive.ItemProps> = $props();
</script>

<SelectPrimitive.Item
  bind:ref
  {value}
  data-slot="select-item"
  class={cn('nc-select-item', className)}
  {...restProps}
>
  {#snippet children({ selected, highlighted })}
    <span class="nc-select-item-label">
      {#if childrenProp}
        {@render childrenProp({ selected, highlighted })}
      {:else}
        {label || value}
      {/if}
    </span>
    <span class="nc-select-item-check">
      {#if selected}
        <CheckIcon class="nc-select-check-icon" />
      {/if}
    </span>
  {/snippet}
</SelectPrimitive.Item>

<style>
  :global(.nc-select-item) {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    margin: 0;
    border-radius: 4px;
    font-size: 13px;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background-color 0.1s ease;
    box-sizing: border-box;
  }

  :global(.nc-select-item:hover),
  :global(.nc-select-item[data-highlighted]) {
    background: var(--nc-level-2, hsl(var(--accent)));
  }

  :global(.nc-select-item[data-selected]) {
    color: var(--nc-accent, hsl(217 91% 60%));
  }

  :global(.nc-select-item[data-selected]:hover),
  :global(.nc-select-item[data-selected][data-highlighted]) {
    background: var(--nc-accent-soft, rgba(111, 157, 255, 0.15));
  }

  :global(.nc-select-item[data-disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }

  :global(.nc-select-item-check) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-left: auto;
  }

  :global(.nc-select-check-icon) {
    width: 14px;
    height: 14px;
    color: var(--nc-accent, hsl(217 91% 60%));
  }

  :global(.nc-select-item-label) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
