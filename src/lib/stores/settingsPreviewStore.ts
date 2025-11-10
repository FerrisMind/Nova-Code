// src/lib/stores/settingsPreviewStore.ts
// -----------------------------------------------------------------------------
// Управление правой панелью превью и контекстной помощью для настроек.
//
// Соответствует контракту из
// [`settingsPreviewStore.api.md`](src/lib/stores/settingsPreviewStore.api.md:1)
// и архитектуре SettingsShell:
//
// - не дублирует состояние настроек;
// - использует registry + SettingDefinition.get() для получения значений;
// - поддерживает inline preview-конфиг и previewId через провайдера;
// - предоставляет стабильный Readable API для использования в SettingsShell.svelte.
// -----------------------------------------------------------------------------

import { writable, type Readable } from 'svelte/store';
import type { SvelteComponent } from 'svelte';
import type { SettingId } from '$lib/settings/types';
import { getSetting } from '$lib/settings/registry';

// -----------------------------------------------------------------------------
// Типы превью
// -----------------------------------------------------------------------------

export type PreviewId = string;

export interface SettingPreviewContext {
  settingId: SettingId;
  value: unknown;
}

export interface InlinePreviewConfig {
  type: 'inline';
  component: typeof SvelteComponent;
  mapContextToProps?: (ctx: SettingPreviewContext) => Record<string, unknown>;
}

export interface PreviewDefinition {
  id: PreviewId;
  component: typeof SvelteComponent;
  mapContextToProps?: (ctx: SettingPreviewContext) => Record<string, unknown>;
}

export interface SettingsPreviewProvider {
  getPreview(previewId: PreviewId): PreviewDefinition | undefined;
}

// -----------------------------------------------------------------------------
// Состояние стора
// -----------------------------------------------------------------------------

export interface SettingsPreviewState {
  activeSettingId: SettingId | null;
  activeSectionId: string | null;
  currentPreview:
    | {
        mode: 'inline';
        config: InlinePreviewConfig;
        context: SettingPreviewContext;
      }
    | {
        mode: 'provider';
        definition: PreviewDefinition;
        context: SettingPreviewContext;
      }
    | null;
  relatedSettings: SettingId[];
  helpText: string | null;
}

// -----------------------------------------------------------------------------
// Публичный интерфейс стора
// -----------------------------------------------------------------------------

export interface SettingsPreviewStore extends Readable<SettingsPreviewState> {
  setActiveSetting(settingId: SettingId, sectionId?: string): void;
  clear(): void;
  registerProvider(provider: SettingsPreviewProvider): void;
  setRelatedSettings(settingIds: SettingId[]): void;
  setHelpText(text: string | null): void;
}

// -----------------------------------------------------------------------------
// Реализация
// -----------------------------------------------------------------------------

function createSettingsPreviewStore(): SettingsPreviewStore {
  const { subscribe, set, update } = writable<SettingsPreviewState>({
    activeSettingId: null,
    activeSectionId: null,
    currentPreview: null,
    relatedSettings: [],
    helpText: null
  });

  let provider: SettingsPreviewProvider | null = null;

  function resolvePreview(
    settingId: SettingId
  ): SettingsPreviewState['currentPreview'] {
    const def = getSetting(settingId);
    if (!def) return null;

    const context: SettingPreviewContext = {
      settingId,
      value: def.get()
    };

    // Inline preview:
    // Ожидается, что если в SettingDefinition будет поле preview (InlinePreviewConfig),
    // SettingsShell или расширенный registry пробросит его сюда.
    const anyDef: any = def;
    if (anyDef.preview && anyDef.preview.type === 'inline') {
      const cfg: InlinePreviewConfig = anyDef.preview;
      return {
        mode: 'inline',
        config: cfg,
        context
      };
    }

    // Provider-based preview:
    if (anyDef.previewId && provider) {
      const defn = provider.getPreview(anyDef.previewId as PreviewId);
      if (defn) {
        return {
          mode: 'provider',
          definition: defn,
          context
        };
      }
    }

    return null;
  }

  const store: SettingsPreviewStore = {
    subscribe,

    setActiveSetting(settingId: SettingId, sectionId?: string): void {
      const def = getSetting(settingId);
      if (!def) {
        // Неизвестная настройка — сброс состояния, но без ошибок.
        set({
          activeSettingId: null,
          activeSectionId: null,
          currentPreview: null,
          relatedSettings: [],
          helpText: null
        });
        return;
      }

      const currentPreview = resolvePreview(settingId);

      update((state) => ({
        ...state,
        activeSettingId: settingId,
        activeSectionId: sectionId ?? def.section ?? state.activeSectionId,
        currentPreview,
        // relatedSettings и helpText могут быть заданы позже вызовами setRelatedSettings/setHelpText
        // поэтому не обнуляем их без необходимости.
        relatedSettings: state.relatedSettings,
        helpText: state.helpText
      }));
    },

    clear(): void {
      set({
        activeSettingId: null,
        activeSectionId: null,
        currentPreview: null,
        relatedSettings: [],
        helpText: null
      });
    },

    registerProvider(p: SettingsPreviewProvider): void {
      provider = p;
      // При смене провайдера можно пересчитать текущее превью.
      let snapshot: SettingsPreviewState | undefined;
      const unsub = subscribe((s) => {
        snapshot = s;
      });
      unsub();

      if (snapshot && snapshot.activeSettingId) {
        const currentPreview = resolvePreview(snapshot.activeSettingId);
        set({
          ...snapshot,
          currentPreview
        });
      }
    },

    setRelatedSettings(settingIds: SettingId[]): void {
      update((state) => ({
        ...state,
        relatedSettings: settingIds
      }));
    },

    setHelpText(text: string | null): void {
      update((state) => ({
        ...state,
        helpText: text
      }));
    }
  };

  return store;
}

// Глобальный экземпляр
export const settingsPreviewStore: SettingsPreviewStore = createSettingsPreviewStore();