<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { cn, type WithoutChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		...restProps
	}: WithoutChild<SelectPrimitive.TriggerProps> & {
		size?: "sm" | "default";
	} = $props();
</script>

<SelectPrimitive.Trigger
	bind:ref
	data-slot="select-trigger"
	data-size={size}
	class={cn("nc-select-trigger", className)}
	{...restProps}
>
	{@render children?.()}
	<ChevronDownIcon class="nc-select-chevron" />
</SelectPrimitive.Trigger>

<style>
	:global(.nc-select-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-width: 120px;
		height: 36px;
		padding: 8px 12px;
		border: 1px solid var(--nc-palette-border, hsl(var(--border)));
		border-radius: 8px;
		background: var(--nc-level-1, hsl(var(--background)));
		color: var(--nc-palette-text, hsl(var(--foreground)));
		font-size: 13px;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
		white-space: nowrap;
		user-select: none;
	}

	:global(.nc-select-trigger:hover:not(:disabled)) {
		border-color: var(--nc-level-4, hsl(var(--border)));
	}

	:global(.nc-select-trigger:focus) {
		border-color: var(--nc-accent, hsl(217 91% 60%));
		box-shadow: 0 0 0 2px var(--nc-accent-soft, rgba(111, 157, 255, 0.2));
	}

	:global(.nc-select-trigger:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.nc-select-trigger[data-size="sm"]) {
		height: 32px;
		padding: 6px 10px;
		font-size: 12px;
	}

	:global(.nc-select-chevron) {
		width: 16px;
		height: 16px;
		opacity: 0.6;
		flex-shrink: 0;
		pointer-events: none;
	}
</style>
