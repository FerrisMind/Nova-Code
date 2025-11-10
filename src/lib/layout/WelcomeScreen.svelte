<script lang="ts">
  // src/lib/layout/WelcomeScreen.svelte
  // ----------------------------------------------------------------------------
  // Welcome screen component for Nova Code.
  // Shows when no files are open in the editor area.
  // ----------------------------------------------------------------------------
</script>

<div class="welcome">
  <div class="logo-orb"></div>
  <div class="title">Nova Code</div>
  <div class="subtitle">Minimal VS Code / Cursor-like UI (mock)</div>
  <div class="hint">Open a file from the Explorer to start editing.</div>
</div>

<style>
  .welcome {
    margin: auto;
    text-align: center;
    color: var(--nc-fg-muted);
    background-color: var(--nc-level-1);
  }

  .logo-orb {
    width: 56px;
    height: 56px;
    margin: 0 auto 10px;
    border-radius: 18px;
    background:
      radial-gradient(circle at 20% 0%, var(--nc-accent), transparent),
      radial-gradient(circle at 80% 80%, #22c55e, transparent),
      radial-gradient(circle at 0% 100%, #a855f7, transparent);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.55);
  }

  .title {
    font-size: 18px;
    font-weight: 500;
    color: var(--nc-fg);
  }

  .subtitle {
    margin-top: 4px;
    font-size: 12px;
  }

  .hint {
    margin-top: 8px;
    font-size: 11px;
    color: var(--nc-fg-muted);
  }
</style>