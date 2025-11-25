<script lang="ts">
  // src/lib/settings/controls/Toggle.svelte
  // ----------------------------------------------------------------------------
  // Обёртка для shadcn-svelte Switch с сохранением оригинального API.
  // ----------------------------------------------------------------------------

  import { createEventDispatcher } from "svelte";
  import { Switch } from "$lib/components/ui/switch";
  import Icon from "$lib/common/Icon.svelte";
  import type {
    SettingDefinition,
    SettingId,
    SettingValue,
  } from "$lib/settings/types";

  type SettingChangeSource = "user" | "profile" | "quickAction" | "command";

  interface SettingChangeMeta {
    settingId: SettingId;
    source: SettingChangeSource;
  }

  interface ToggleProps {
    definition: SettingDefinition;
    value?: boolean | SettingValue;
    onChange?: (next: boolean, meta: SettingChangeMeta) => void;
    disabled?: boolean;
    compact?: boolean;
    id?: string;
    idPrefix?: string;
  }

  const dispatch = createEventDispatcher<{
    change: { value: boolean; meta: SettingChangeMeta };
  }>();

  let {
    definition,
    value = undefined,
    onChange = undefined,
    disabled = false,
    compact = false,
    id = "",
    idPrefix = "setting-toggle",
  }: ToggleProps = $props();

  const resolveId = () => {
    if (id) return id;
    return `${idPrefix}-${definition.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  };

  const normalizeToBoolean = (raw: unknown): boolean => {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw !== 0;
    if (typeof raw === "string") {
      const v = raw.toLowerCase().trim();
      if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
      if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    }
    return false;
  };

  let checked = $state(false);

  const syncChecked = () => {
    if (value !== undefined) {
      checked = normalizeToBoolean(value);
    } else {
      try {
        checked = normalizeToBoolean(definition.get());
      } catch {
        checked = false;
      }
    }
  };

  // Синхронизация при изменении value
  $effect(() => {
    syncChecked();
  });

  const handleChange = (newChecked: boolean) => {
    if (disabled) return;

    const meta: SettingChangeMeta = {
      settingId: definition.id,
      source: "user",
    };

    if (onChange) {
      onChange(newChecked, meta);
    } else {
      definition.set(newChecked as SettingValue);
    }

    checked = newChecked;
    dispatch("change", { value: newChecked, meta });
  };

  // Определяем нужны ли иконки (для theme.mode)
  const showIcons = () => definition.id === "theme.mode";
</script>

<div
  class="nc-toggle-wrapper {compact ? 'compact' : ''} {showIcons()
    ? 'with-icons'
    : ''}"
>
  {#if showIcons()}
    <span class="nc-toggle-icon nc-toggle-icon-left" class:active={!checked}>
      <Icon name="sun" size={compact ? 12 : 14} />
    </span>
  {/if}

  <Switch
    id={resolveId()}
    bind:checked
    {disabled}
    aria-label={definition.label}
    onCheckedChange={handleChange}
  />

  {#if showIcons()}
    <span class="nc-toggle-icon nc-toggle-icon-right" class:active={checked}>
      <Icon name="moon" size={compact ? 12 : 14} />
    </span>
  {/if}
</div>

<style>
  .nc-toggle-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .nc-toggle-wrapper.compact {
    gap: 6px;
  }

  /* Иконки для theme.mode */
  .nc-toggle-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--nc-palette-text);
    opacity: 0.5;
    transition: opacity 0.22s cubic-bezier(0.33, 0.02, 0.11, 0.99);
  }

  .nc-toggle-icon.active {
    opacity: 1;
  }
</style>
