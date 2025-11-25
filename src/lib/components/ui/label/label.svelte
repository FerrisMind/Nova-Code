<script lang="ts">
import { Label as LabelPrimitive } from "bits-ui";
import { cn } from "$lib/utils.js";

let { class: className, ...props }: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	data-slot="label"
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className,
	)}
	{...props}
/>
