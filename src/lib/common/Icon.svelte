<script lang="ts">
  import { getIcon } from '../mocks/icons';
  import * as Lucide from 'lucide-svelte';

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
   */

  export let name: string;
  export let size: number = 22;
  export let className: string = '';

  const [set, key] = name.split(':');

  const isLucide = set === 'lucide' && key in (Lucide as any);
  const isDevicon = set === 'devicon';

  /**
   * Маппинг devicon по реальному devicon.json
   * name передаём строго в формате "devicon:{tech}-{variant}" или "devicon:{tech}-{variant} colored"
   * Поддерживаемые иконки из официального devicon репозитория
   */
  function resolveDeviconClass(iconKey: string): { baseClass: string; hasColored: boolean } {
    if (iconKey && iconKey.length > 0) {
      const parts = iconKey.split(' ');
      const baseClass = `devicon-${parts[0]}`;
      const hasColored = parts.includes('colored');
      return { baseClass, hasColored };
    }
    return { baseClass: '', hasColored: false };
  }

  const deviconData = isDevicon ? resolveDeviconClass(key) : { baseClass: '', hasColored: false };

  // ВАЖНО: поддерживаем исходные codicon-* через mocks/getIcon:
  // ActivityBar и sidebarRegistry используют:
  // - codicon-files
  // - codicon-search
  // - codicon-source-control
  // - codicon-extensions
  // - codicon-settings-gear
  // getIcon(name) уже содержит SVG для этих ключей в mocks/icons.ts.
  const svg = !isLucide && !deviconData.baseClass ? getIcon(name) : '';
</script>

{#if isLucide}
  {@const LucideIcon = (Lucide as any)[key]}
  {#if LucideIcon}
    <LucideIcon class={`nc-icon ${className}`} size={size} aria-hidden="true" />
  {:else if svg}
    <!-- fallback, если lucide-иконка не найдена, но есть svg в mocks -->
    <span
      class={`nc-icon ${className}`}
      style={`width:${size}px;height:${size}px;`}
      aria-hidden="true"
    >
      {@html svg}
    </span>
  {/if}
{:else if deviconData.baseClass}
  <i
    class={`nc-icon ${deviconData.baseClass}${deviconData.hasColored ? ' colored' : ''} ${className}`}
    style={`font-size:${size}px;`}
    aria-hidden="true"
  ></i>
{:else if svg}
  <span
    class={`nc-icon ${className}`}
    style={`width:${size}px;height:${size}px;`}
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
  }

  .nc-icon :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    color: inherit; /* Для Lucide SVG иконок */
  }
</style>
