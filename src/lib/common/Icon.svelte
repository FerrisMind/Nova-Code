<script lang="ts">
  import { getIcon } from '../mocks/icons';
  import * as Lucide from 'lucide-svelte';
  import { theme } from '../stores/themeStore';
  import { getIconColorFromDevicon, type ThemeMode } from '../stores/ICON_COLORS_PALETTE';

  /**
   * Строгий протокол без выдумок:
   *
   * Поддерживаем:
   * - "lucide:Search" → Lucide.Search
   * - "lucide:GitBranch" → Lucide.GitBranch
   * - и любые другие реальные lucide-иконки по имени
   *
   * - "devicon:typescript-plain"  → <i class="devicon-typescript-plain">
   * - "devicon:javascript-plain"  → <i class="devicon-javascript-plain">
   * - "devicon:svelte-plain"      → <i class="devicon-svelte-plain">
   * - "devicon:rust-plain"        → <i class="devicon-rust-plain">
   *
   * Никаких devicon-json-plain / devicon-markdown-plain и т.п.
   * Всё остальное → fallback SVG из mocks/icons.ts.
   * 
   * Цвета иконок автоматически адаптируются к текущей теме (light/dark)
   * через ICON_COLORS_PALETTE.
   */

  type IconProps = {
    name: string;
    size?: number;
    className?: string;
    /** Использовать адаптивный цвет из ICON_COLORS_PALETTE */
    useAdaptiveColor?: boolean;
    /** Переопределить цвет вручную (приоритет выше useAdaptiveColor) */
    color?: string | undefined;
  };

  let {
    name,
    size = 22,
    className = '',
    useAdaptiveColor = false,
    color = undefined
  }: IconProps = $props();

  const [set, key] = name.split(':');

  // Конвертировать kebab-case в PascalCase для Lucide иконок
  function kebabToPascal(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  const lucideKey = set === 'lucide' ? kebabToPascal(key) : key;
  const isLucide = set === 'lucide' && lucideKey in (Lucide as any);
  const isDevicon = set === 'devicon';

  /**
   * Маппинг devicon по реальному devicon.json
   * name передаём строго в формате "devicon:{tech}-{variant}" или "devicon:{tech}-{variant} colored"
   * Поддерживаемые иконки из официального devicon репозитория
   */
  function resolveDeviconClass(iconKey: string): { baseClass: string; hasColored: boolean; techName: string } {
    if (iconKey && iconKey.length > 0) {
      const parts = iconKey.split(' ');
      const baseClass = `devicon-${parts[0]}`;
      const hasColored = parts.includes('colored');
      // Извлекаем имя технологии (например, "typescript" из "typescript-plain")
      const techName = parts[0].split('-')[0];
      return { baseClass, hasColored, techName };
    }
    return { baseClass: '', hasColored: false, techName: '' };
  }

  const deviconData = isDevicon ? resolveDeviconClass(key) : { baseClass: '', hasColored: false, techName: '' };

  // ВАЖНО: поддерживаем исходные codicon-* через mocks/getIcon:
  // ActivityBar и sidebarRegistry используют:
  // - codicon-files
  // - codicon-search
  // - codicon-source-control
  // - codicon-extensions
  // - codicon-settings-gear
  // getIcon(name) уже содержит SVG для этих ключей в mocks/icons.ts.
  const svg = !isLucide && !deviconData.baseClass ? getIcon(name) : '';

  // Реактивно получаем текущую тему
  const currentTheme = $derived($theme.mode as ThemeMode);

  // Вычисляем адаптивный цвет для иконки
  const adaptiveColor = $derived(
    useAdaptiveColor && !color ? getIconColorFromDevicon(name, currentTheme) : undefined
  );

  // Итоговый цвет: приоритет у явно заданного color, затем adaptiveColor
  const finalColor = $derived(color || adaptiveColor);

  // Для devicon с colored классом используем адаптивный цвет только если useAdaptiveColor=true
  const useDeviconColored = $derived(deviconData.hasColored && !useAdaptiveColor && !color);
</script>

{#if isLucide}
  {@const LucideIcon = (Lucide as any)[lucideKey]}
  {#if LucideIcon}
    <LucideIcon 
      class={`nc-icon ${className}`} 
      size={size} 
      aria-hidden="true"
      style={finalColor ? `color: ${finalColor};` : ''}
    />
  {:else if svg}
    <!-- fallback, если lucide-иконка не найдена, но есть svg в mocks -->
    <span
      class={`nc-icon ${className}`}
      style={`width:${size}px;height:${size}px;${finalColor ? `color:${finalColor};` : ''}`}
      aria-hidden="true"
    >
      {@html svg}
    </span>
  {/if}
{:else if deviconData.baseClass}
  <i
    class={`nc-icon ${deviconData.baseClass}${useDeviconColored ? ' colored' : ''} ${className}`}
    style={`font-size:${size}px;${finalColor ? `color:${finalColor};` : ''}`}
    aria-hidden="true"
  ></i>
{:else if svg}
  <span
    class={`nc-icon ${className}`}
    style={`width:${size}px;height:${size}px;${finalColor ? `color:${finalColor};` : ''}`}
    aria-hidden="true"
  >
    {@html svg}
  </span>
{:else}
  <!-- Жёсткий фикс: если ни lucide, ни devicon, ни svg — ничего не рендерим.
       Это убирает "пропажу" в случае битых имён и не ломает layout. -->
{/if}

<style>
  .nc-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: var(--icon-size, 16px);
    min-height: var(--icon-size, 16px);
  }

  .nc-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    color: inherit; /* Для Lucide SVG иконок */
    flex-shrink: 0;
  }

  i.nc-icon {
    flex-shrink: 0;
  }
</style>
