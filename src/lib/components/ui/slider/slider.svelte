<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	type Props = {
		ref?: HTMLElement | null;
		value?: number | number[];
		onValueChange?: (value: number[]) => void;
		onValueCommit?: (value: number[]) => void;
		orientation?: "horizontal" | "vertical";
		class?: string;
		disabled?: boolean;
		min?: number;
		max?: number;
		step?: number;
		type?: "single" | "multiple";
		"aria-label"?: string;
		"aria-labelledby"?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable([0]),
		onValueChange,
		onValueCommit,
		orientation = "horizontal",
		class: className,
		disabled = false,
		min = 0,
		max = 100,
		step = 1,
		type = "single",
		...restProps
	}: Props = $props();

	// Normalize value to always be an array for the primitive
	const normalizedValue = $derived(Array.isArray(value) ? value : [value]);

	// Handle value changes
	function handleValueChange(newValue: number[]) {
		if (type === "single") {
			value = newValue[0];
		} else {
			value = newValue;
		}
		onValueChange?.(newValue);
	}
</script>

{#if type === "single"}
	<SliderPrimitive.Root
		bind:ref
		type="single"
		value={normalizedValue[0]}
		onValueChange={(v) => handleValueChange([v])}
		onValueCommit={onValueCommit ? (v) => onValueCommit([v]) : undefined}
		data-slot="slider"
		{orientation}
		{disabled}
		{min}
		{max}
		{step}
		class={cn(
			"relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
			className
		)}
		{...restProps}
	>
		{#snippet children({ thumbs })}
			<span
				data-orientation={orientation}
				data-slot="slider-track"
				class={cn(
					"bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5"
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					class={cn(
						"bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					)}
				/>
			</span>
			{#each thumbs as thumb (thumb)}
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					index={thumb}
					class="border-primary bg-background ring-ring/50 focus-visible:outline-hidden block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50"
				/>
			{/each}
		{/snippet}
	</SliderPrimitive.Root>
{:else}
	<SliderPrimitive.Root
		bind:ref
		type="multiple"
		value={normalizedValue}
		onValueChange={handleValueChange}
		{onValueCommit}
		data-slot="slider"
		{orientation}
		{disabled}
		{min}
		{max}
		{step}
		class={cn(
			"relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[disabled]:opacity-50",
			className
		)}
		{...restProps}
	>
		{#snippet children({ thumbs })}
			<span
				data-orientation={orientation}
				data-slot="slider-track"
				class={cn(
					"bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-1.5"
				)}
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					class={cn(
						"bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					)}
				/>
			</span>
			{#each thumbs as thumb (thumb)}
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					index={thumb}
					class="border-primary bg-background ring-ring/50 focus-visible:outline-hidden block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50"
				/>
			{/each}
		{/snippet}
	</SliderPrimitive.Root>
{/if}
