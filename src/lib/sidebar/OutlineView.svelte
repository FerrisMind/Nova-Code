<script lang="ts">
  /**
   * OutlineView компонент для правой панели
   * Показывает структуру текущего файла
   */
</script>

<div class="outline-view">
  <div class="outline-header">
    <h2>Outline</h2>
  </div>
  <div class="outline-content">
    <p>No structure available</p>
  </div>
</div>

<style>
  .outline-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px;
    color: var(--nc-fg-muted);
    font-size: 12px;
  }

  .outline-header {
    margin-bottom: 12px;
  }

  .outline-header h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--nc-fg);
  }

  .outline-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
  }

  .outline-content p {
    margin: 0;
    color: var(--nc-fg-muted);
  }
</style>
