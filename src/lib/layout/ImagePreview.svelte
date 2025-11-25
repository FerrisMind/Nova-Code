<script lang="ts">
  // src/lib/layout/ImagePreview.svelte
  // ---------------------------------------------------------------------------
  // Компонент для превью изображений в редакторе.
  // Поддерживает: png, jpg, jpeg, gif, webp, bmp, ico, svg
  // Функции: зум, перетаскивание, fit-to-container, показ метаданных
  // Для SVG: split view с кодом справа
  // ---------------------------------------------------------------------------

  import { onMount, onDestroy } from "svelte";
  import { convertFileSrc } from "@tauri-apps/api/core";
  import MonacoHost from "../editor/MonacoHost.svelte";
  import { fileService } from "../services/fileService";
  import { editorSettings } from "../stores/editorSettingsStore";

  interface Props {
    path: string;
    title: string;
  }

  let { path, title }: Props = $props();

  // Определяем, является ли файл SVG
  let isSvgFile = $derived(path.toLowerCase().endsWith('.svg'));
  
  // Split view для SVG
  let splitViewEnabled = $state(false);
  let svgContent = $state<string>('');
  let svgContentLoaded = $state(false);
  let editorOptions = $state(editorSettings.getSettings());

  // SVG wrapper ref для получения размеров
  let svgWrapperRef = $state<HTMLDivElement | null>(null);

  // Состояние зума и позиции
  let scale = $state(1);
  let translateX = $state(0);
  let translateY = $state(0);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let initialTranslateX = 0;
  let initialTranslateY = 0;

  // Размеры изображения
  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let imageLoaded = $state(false);
  let imageError = $state<string | null>(null);

  // Контейнер и изображение
  let containerRef: HTMLDivElement | null = null;
  let imageRef = $state<HTMLImageElement | null>(null);

  // Конвертируем путь для Tauri
  let imageSrc = $derived(convertFileSrc(path));

  // Сброс состояния при смене файла
  let previousPath = $state<string | null>(null);
  
  $effect(() => {
    if (path !== previousPath) {
      // Сбрасываем все состояния при смене файла
      previousPath = path;
      svgContent = '';
      svgContentLoaded = false;
      imageLoaded = false;
      imageError = null;
      naturalWidth = 0;
      naturalHeight = 0;
      scale = 1;
      translateX = 0;
      translateY = 0;
      
      // Загружаем SVG контент для нового файла
      if (isSvgFile) {
        loadSvgContent();
      }
    }
  });

  // Загрузка SVG контента (для inline рендеринга и split view)
  async function loadSvgContent() {
    if (!isSvgFile) return;
    try {
      svgContent = await fileService.readFile(path);
      svgContentLoaded = true;
      // Извлекаем размеры из SVG после загрузки
      extractSvgDimensions();
    } catch (err) {
      console.error('[ImagePreview] Failed to load SVG content:', err);
      svgContent = '<!-- Failed to load SVG content -->';
      svgContentLoaded = true;
      imageError = 'Failed to load SVG';
    }
  }

  // Извлечение размеров SVG из атрибутов или viewBox
  function extractSvgDimensions() {
    if (!svgContent) return;
    
    // Парсим SVG чтобы получить размеры
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    
    if (svgEl) {
      // Пробуем получить width/height из атрибутов
      let w = parseFloat(svgEl.getAttribute('width') || '0');
      let h = parseFloat(svgEl.getAttribute('height') || '0');
      
      // Если нет, берём из viewBox
      if (!w || !h) {
        const viewBox = svgEl.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/).map(parseFloat);
          if (parts.length >= 4) {
            w = parts[2];
            h = parts[3];
          }
        }
      }
      
      if (w && h) {
        naturalWidth = Math.round(w);
        naturalHeight = Math.round(h);
        imageLoaded = true;
        imageError = null;
        fitToContainer();
      }
    }
  }

  function toggleSplitView() {
    splitViewEnabled = !splitViewEnabled;
  }

  // Определяем формат файла
  let fileFormat = $derived(() => {
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return ext.toUpperCase();
  });

  // Форматируем размер файла (заглушка, можно расширить)
  let fileSizeFormatted = $derived(() => {
    return "—"; // Можно добавить получение размера через Tauri
  });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 10;
  const ZOOM_STEP = 0.1;

  function handleImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    naturalWidth = img.naturalWidth;
    naturalHeight = img.naturalHeight;
    imageLoaded = true;
    imageError = null;
    fitToContainer();
  }

  function handleImageError() {
    imageError = "Failed to load image";
    imageLoaded = false;
  }

  function fitToContainer() {
    if (!containerRef || !naturalWidth || !naturalHeight) return;

    const containerRect = containerRef.getBoundingClientRect();
    const padding = 40; // Отступы от краёв
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;

    const scaleX = availableWidth / naturalWidth;
    const scaleY = availableHeight / naturalHeight;
    const newScale = Math.min(scaleX, scaleY, 1); // Не увеличиваем больше 100%

    scale = newScale;
    translateX = 0;
    translateY = 0;
  }

  function zoomIn() {
    scale = Math.min(scale + ZOOM_STEP, MAX_SCALE);
  }

  function zoomOut() {
    scale = Math.max(scale - ZOOM_STEP, MIN_SCALE);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

    // Зум относительно позиции курсора
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - rect.width / 2;
      const mouseY = event.clientY - rect.top - rect.height / 2;

      const scaleFactor = newScale / scale;
      translateX = mouseX - (mouseX - translateX) * scaleFactor;
      translateY = mouseY - (mouseY - translateY) * scaleFactor;
    }

    scale = newScale;
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Только левая кнопка
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    initialTranslateX = translateX;
    initialTranslateY = translateY;
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    translateX = initialTranslateX + (event.clientX - dragStartX);
    translateY = initialTranslateY + (event.clientY - dragStartY);
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
    } else if (event.key === "-") {
      event.preventDefault();
      zoomOut();
    } else if (event.key === "0") {
      event.preventDefault();
      resetZoom();
    } else if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      fitToContainer();
    }
  }

  // Подписка на настройки редактора
  const settingsUnsub = editorSettings.subscribe((settings) => {
    editorOptions = settings;
  });

  onMount(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    // SVG контент загружается через $effect при изменении path
  });

  onDestroy(() => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("keydown", handleKeyDown);
    settingsUnsub();
  });

  // Реагируем на изменение размера контейнера
  $effect(() => {
    if (containerRef && imageLoaded) {
      const resizeObserver = new ResizeObserver(() => {
        // Опционально: можно вызывать fitToContainer() при изменении размера
      });
      resizeObserver.observe(containerRef);
      return () => resizeObserver.disconnect();
    }
  });

  // Форматирование процента зума
  let zoomPercent = $derived(Math.round(scale * 100));
</script>

<div class="image-preview-root">
  <!-- Toolbar -->
  <div class="image-toolbar">
    <div class="toolbar-group">
      <button class="toolbar-btn" onclick={zoomOut} title="Zoom Out (-)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 7h10v2H3z" />
        </svg>
      </button>
      <span class="zoom-level">{zoomPercent}%</span>
      <button class="toolbar-btn" onclick={zoomIn} title="Zoom In (+)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3v4H3v2h5v4h2V9h5V7H10V3z" />
        </svg>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button class="toolbar-btn" onclick={fitToContainer} title="Fit to Window (F)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h4v1H3v3H2V2zm8 0h4v4h-1V3h-3V2zm4 8v4h-4v-1h3v-3h1zM2 10v4h4v-1H3v-3H2z" />
        </svg>
      </button>
      <button class="toolbar-btn" onclick={resetZoom} title="Actual Size (0)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 3v10H5V9H2V8h3V3h1zm4 0h1v5h3v1h-3v5h-1V3z" />
        </svg>
      </button>
    </div>

    <!-- SVG Split View Toggle -->
    {#if isSvgFile}
      <div class="toolbar-divider"></div>
      <div class="toolbar-group">
        <button 
          class="toolbar-btn"
          class:active={splitViewEnabled}
          onclick={toggleSplitView} 
          title="Toggle Code View"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm0 13H8V2h6v12zM2 2h5v12H2V2z" />
          </svg>
        </button>
      </div>
    {/if}

    <div class="toolbar-spacer"></div>

    <!-- Metadata -->
    {#if imageLoaded}
      <div class="image-meta">
        <span class="meta-item">{naturalWidth} × {naturalHeight}</span>
        <span class="meta-divider">•</span>
        <span class="meta-item">{fileFormat()}</span>
      </div>
    {/if}
  </div>

  <!-- Content area: split view or single image -->
  <div class="content-area" class:split-view={splitViewEnabled && isSvgFile}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- Image Container - interactive for zoom/pan functionality -->
    <div
      class="image-container"
      bind:this={containerRef}
      onwheel={handleWheel}
      onmousedown={handleMouseDown}
      class:dragging={isDragging}
      role="application"
      aria-label="Image viewer: {title}"
    >
      {#if imageError}
        <div class="image-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          <p>{imageError}</p>
          <p class="error-path">{path}</p>
        </div>
      {:else}
        <!-- Checkerboard background для прозрачности -->
        {#if isSvgFile}
          <!-- SVG: используем width/height вместо transform:scale для сохранения векторного качества -->
          <div
            class="image-wrapper svg-wrapper"
            style:transform="translate({translateX}px, {translateY}px)"
          >
            {#if svgContentLoaded}
              <div 
                class="svg-inline-wrapper"
                bind:this={svgWrapperRef}
                style:width="{naturalWidth * scale}px"
                style:height="{naturalHeight * scale}px"
              >
                {@html svgContent}
              </div>
            {:else}
              <div class="svg-loading">Loading SVG...</div>
            {/if}
          </div>
        {:else}
          <!-- Растровые изображения: используем transform:scale -->
          <div
            class="image-wrapper"
            style:transform="translate({translateX}px, {translateY}px) scale({scale})"
          >
            <img
              bind:this={imageRef}
              src={imageSrc}
              alt={title}
              onload={handleImageLoad}
              onerror={handleImageError}
              draggable="false"
            />
          </div>
        {/if}
      {/if}
    </div>

    <!-- SVG Code Panel (right side in split view) -->
    {#if splitViewEnabled && isSvgFile}
      <div class="split-divider"></div>
      <div class="code-panel">
        {#if svgContentLoaded}
          <MonacoHost
            fileId="{path}-preview"
            uri="file://{path}"
            value={svgContent}
            language="xml"
            options={{
              theme: editorOptions.theme,
              tabSize: editorOptions.tabSize,
              insertSpaces: editorOptions.insertSpaces,
              wordWrap: editorOptions.wordWrap,
              wordWrapColumn: editorOptions.wordWrapColumn,
              minimap: { enabled: false },
              folding: editorOptions.folding,
              bracketPairColorization: { enabled: editorOptions.bracketPairColorization },
              fontSize: editorOptions.fontSize,
              fontFamily: editorOptions.fontFamily,
              fontLigatures: editorOptions.fontLigatures,
              renderWhitespace: editorOptions.renderWhitespace,
              lineNumbers: editorOptions.lineNumbers,
              readOnly: false,
            }}
            on:change={(e) => {
              svgContent = e.detail.value;
              extractSvgDimensions();
            }}
          />
        {:else}
          <div class="code-loading">
            <span>Loading SVG code...</span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .image-preview-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: var(--nc-level-1);
    overflow: hidden;
  }

  .image-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--nc-tab-bg-active);
    border-bottom: 1px solid var(--nc-border-subtle);
    flex-shrink: 0;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--nc-fg-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toolbar-btn:hover {
    background: var(--nc-bg-hover);
    color: var(--nc-fg);
  }

  .toolbar-btn:active {
    background: var(--nc-highlight-subtle);
  }

  .toolbar-btn.active {
    background: var(--nc-accent-soft);
    color: var(--nc-accent);
  }

  .toolbar-btn.active:hover {
    background: var(--nc-accent-soft);
  }

  .zoom-level {
    min-width: 48px;
    text-align: center;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--nc-fg-muted);
  }

  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--nc-border-subtle);
    margin: 0 4px;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .image-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--nc-fg-muted);
  }

  .meta-item {
    font-variant-numeric: tabular-nums;
  }

  .meta-divider {
    opacity: 0.5;
  }

  .image-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    cursor: grab;
    position: relative;

    /* Checkerboard background */
    background-color: var(--nc-level-0);
    background-image: linear-gradient(45deg, var(--nc-level-1) 25%, transparent 25%),
      linear-gradient(-45deg, var(--nc-level-1) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--nc-level-1) 75%),
      linear-gradient(-45deg, transparent 75%, var(--nc-level-1) 75%);
    background-size: 16px 16px;
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0px;
  }

  .image-container:focus {
    outline: none;
  }

  .image-container.dragging {
    cursor: grabbing;
  }

  .image-wrapper {
    transform-origin: center center;
    will-change: transform;
    transition: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-wrapper img {
    max-width: none;
    max-height: none;
    user-select: none;
    -webkit-user-drag: none;
    image-rendering: auto;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }

  /* SVG inline wrapper - сохраняет векторное качество при любом зуме */
  .svg-inline-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    overflow: hidden;
    /* Прозрачный фон - SVG сохраняет свою прозрачность */
  }

  .svg-inline-wrapper :global(svg) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }

  .svg-loading {
    color: var(--nc-fg-muted);
    font-size: 13px;
    padding: 24px;
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--nc-fg-muted);
    text-align: center;
    padding: 24px;
  }

  .image-error p {
    margin: 0;
    font-size: 14px;
  }

  .image-error .error-path {
    font-family: monospace;
    font-size: 12px;
    opacity: 0.7;
    word-break: break-all;
    max-width: 400px;
  }

  /* Content area and split view */
  .content-area {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .content-area.split-view .image-container {
    flex: 1;
    min-width: 0;
  }

  .split-divider {
    width: 4px;
    background: var(--nc-border-subtle);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.15s ease;
  }

  .split-divider:hover {
    background: var(--nc-fg-muted);
  }

  .code-panel {
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    background: var(--nc-level-1);
    overflow: hidden;
  }

  .code-panel :global(.monaco-editor) {
    height: 100% !important;
  }

  .code-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--nc-fg-muted);
    font-size: 13px;
  }
</style>

