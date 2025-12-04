<script lang="ts">
  import { Switch as SwitchPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    class: className,
    ...props
  }: SwitchPrimitive.RootProps = $props();
</script>

<SwitchPrimitive.Root
  bind:ref
  bind:checked
  data-slot="switch"
  class={cn('nc-switch', className)}
  {...props}
>
  <SwitchPrimitive.Thumb data-slot="switch-thumb" class="nc-switch-thumb" />
</SwitchPrimitive.Root>

<style>
  :global(.nc-switch) {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 40px;
    height: 22px;
    padding: 2px;
    border-radius: 11px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
    background-color: var(--nc-level-3, hsl(var(--muted)));
  }

  :global(.nc-switch:focus-visible) {
    outline: 2px solid var(--nc-accent, hsl(var(--ring)));
    outline-offset: 2px;
  }

  :global(.nc-switch:disabled) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  :global(.nc-switch[data-state='checked']) {
    background-color: var(--nc-accent, #6f9dff);
  }

  :global(.nc-switch-thumb) {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: var(--nc-level-0, white);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
    pointer-events: none;
  }

  :global(.nc-switch[data-state='checked'] .nc-switch-thumb) {
    transform: translateX(18px);
  }

  :global(.nc-switch[data-state='unchecked'] .nc-switch-thumb) {
    transform: translateX(0);
  }
</style>
