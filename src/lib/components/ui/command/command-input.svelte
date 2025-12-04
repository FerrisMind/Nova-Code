<script lang="ts">
  import { Command as CommandPrimitive } from 'bits-ui';
  import SearchIcon from '@lucide/svelte/icons/search';
  import { cn } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(''),
    ...restProps
  }: CommandPrimitive.InputProps = $props();
</script>

<div data-slot="command-input-wrapper">
  <SearchIcon />
  <CommandPrimitive.Input
    data-slot="command-input"
    class={cn('w-full', className)}
    bind:ref
    {...restProps}
    bind:value
  />
</div>
