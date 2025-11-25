<script lang="ts">
import { RadioGroup as RadioGroupPrimitive } from "bits-ui";
import CircleIcon from "@lucide/svelte/icons/circle";
import { cn } from "$lib/utils.js";

let { ref = $bindable(null), class: className, ...props }: RadioGroupPrimitive.ItemProps =
  $props();
</script>

<RadioGroupPrimitive.Item
  bind:ref
  data-slot="radio-group-item"
  class={cn(
    "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  {...props}
>
  {#snippet children({ checked })}
    <div data-slot="radio-group-indicator" class="relative flex items-center justify-center">
      {#if checked}
        <CircleIcon class="h-2.5 w-2.5 fill-current text-current" />
      {/if}
    </div>
  {/snippet}
</RadioGroupPrimitive.Item>
