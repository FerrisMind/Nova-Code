<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  let { class: className, ...props }: RadioGroupPrimitive.RootProps = $props();
</script>

<RadioGroupPrimitive.Root data-slot="radio-group" class={cn('grid gap-2', className)} {...props} />
