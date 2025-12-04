<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';
  import TooltipPortal from './tooltip-portal.svelte';
  import type { ComponentProps } from 'svelte';
  import type { WithoutChildrenOrChild } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 0,
    side = 'top',
    children,
    arrowClasses,
    portalProps,
    ...restProps
  }: TooltipPrimitive.ContentProps & {
    arrowClasses?: string;
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof TooltipPortal>>;
  } = $props();
</script>

<TooltipPortal {...portalProps}>
  <TooltipPrimitive.Content
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    {side}
    class={cn('nc-tooltip-content', className)}
    {...restProps}
  >
    {@render children?.()}
    <TooltipPrimitive.Arrow>
      {#snippet child({ props })}
        <div class={cn('nc-tooltip-arrow', arrowClasses)} {...props}></div>
      {/snippet}
    </TooltipPrimitive.Arrow>
  </TooltipPrimitive.Content>
</TooltipPortal>

<style>
  :global(.nc-tooltip-content) {
    z-index: 50;
    display: inline-flex;
    flex-direction: column;
    max-width: 320px;
    padding: 8px 12px;
    background: var(--nc-bg-elevated, #1e1e1e);
    color: var(--nc-fg, #fafafa);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    font-size: 12px;
    line-height: 1.4;
    white-space: normal;
    word-break: break-word;
  }

  :global(.nc-tooltip-content[data-state='closed']) {
    display: none;
  }

  :global(.nc-tooltip-arrow) {
    width: 10px;
    height: 10px;
    background: var(--nc-bg-elevated, #1e1e1e);
    transform: rotate(45deg);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  }
</style>
