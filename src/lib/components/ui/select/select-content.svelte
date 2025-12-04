<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import SelectPortal from './select-portal.svelte';
  import SelectScrollUpButton from './select-scroll-up-button.svelte';
  import SelectScrollDownButton from './select-scroll-down-button.svelte';
  import { cn, type WithoutChild } from '$lib/utils.js';
  import type { ComponentProps } from 'svelte';
  import type { WithoutChildrenOrChild } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    portalProps,
    children,
    preventScroll = true,
    ...restProps
  }: WithoutChild<SelectPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SelectPortal>>;
  } = $props();
</script>

<SelectPortal {...portalProps}>
  <SelectPrimitive.Content
    bind:ref
    {sideOffset}
    {preventScroll}
    data-slot="select-content"
    class={cn('nc-select-content', className)}
    {...restProps}
  >
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport class="nc-select-viewport">
      {@render children?.()}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
</SelectPortal>

<style>
  :global(.nc-select-content) {
    position: relative;
    z-index: 50;
    min-width: 140px;
    max-height: var(--bits-select-content-available-height, 300px);
    overflow: hidden;
    background: var(--nc-level-0, hsl(var(--popover)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transform-origin: var(--bits-select-content-transform-origin);
  }

  :global(.nc-select-content[data-state='open']) {
    animation: selectFadeIn 0.15s ease-out;
  }

  :global(.nc-select-content[data-state='closed']) {
    animation: selectFadeOut 0.1s ease-in;
  }

  @keyframes selectFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes selectFadeOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  :global(.nc-select-viewport) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    padding: 6px;
    overflow-y: auto;
    max-height: inherit;
    box-sizing: border-box;
  }
</style>
