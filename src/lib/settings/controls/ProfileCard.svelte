<script lang="ts">
  // src/lib/settings/controls/ProfileCard.svelte
  // ----------------------------------------------------------------------------
  // Карточка профиля настроек.
  //
  // Показывает:
  // - Иконку профиля
  // - Название
  // - Badge "Active" если активен
  // - Кнопки Apply / Delete
  //
  // Стиль: карточки с hover эффектами, активная карточка выделена
  // ----------------------------------------------------------------------------

  import { Check, Trash2 } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  // ---------------------------------------------------------------------------
  // Типы
  // ---------------------------------------------------------------------------

  interface Profile {
    id: string;
    label: string;
    icon?: string;
    description?: string;
    isDefault?: boolean;
  }

  interface ProfileCardProps {
    profile: Profile;
    isActive?: boolean;
    onApply?: () => void;
    onDelete?: () => void;
  }

  let {
    profile,
    isActive = false,
    onApply = undefined,
    onDelete = undefined
  }: ProfileCardProps = $props();

  // ---------------------------------------------------------------------------
  // Обработчики
  // ---------------------------------------------------------------------------

  function handleApply() {
    if (!isActive && onApply) {
      onApply();
    }
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation();
    if (!profile.isDefault && onDelete) {
      onDelete();
    }
  }

  // Emoji для профиля (fallback если нет иконки)
  function getProfileEmoji(label: string): string {
    const lower = label.toLowerCase();
    if (lower.includes('default')) return '⚙️';
    if (lower.includes('coding') || lower.includes('code')) return '💻';
    if (lower.includes('present') || lower.includes('demo')) return '📺';
    if (lower.includes('dark')) return '🌙';
    if (lower.includes('light')) return '☀️';
    if (lower.includes('minimal')) return '✨';
    return '📁';
  }
</script>

<div 
  class="profile-card"
  class:active={isActive}
  role="article"
  aria-label={`Profile: ${profile.label}`}
>
  <div class="card-header">
    <span class="profile-icon" aria-hidden="true">
      {profile.icon || getProfileEmoji(profile.label)}
    </span>
    <span class="profile-name">{profile.label}</span>
    {#if isActive}
      <Badge variant="default" class="active-badge">
        <Check size={10} />
        Active
      </Badge>
    {/if}
  </div>

  {#if profile.description}
    <p class="profile-description">{profile.description}</p>
  {/if}

  <div class="card-actions">
    {#if !isActive}
      <Button 
        size="sm" 
        variant="outline"
        onclick={handleApply}
      >
        Apply
      </Button>
    {:else}
      <span class="current-label">Current profile</span>
    {/if}

    {#if !profile.isDefault}
      <Button
        size="sm"
        variant="ghost"
        class="delete-btn"
        onclick={handleDelete}
        aria-label={`Delete profile ${profile.label}`}
      >
        <Trash2 size={14} />
      </Button>
    {/if}
  </div>
</div>

<style>
  .profile-card {
    display: flex;
    flex-direction: column;
    gap: var(--settings-space-sm, 8px);
    padding: var(--settings-space-md, 16px);
    background: var(--nc-level-0, hsl(var(--card)));
    border: 1px solid var(--nc-palette-border, hsl(var(--border)));
    border-radius: var(--settings-radius-lg, 12px);
    transition: 
      border-color var(--settings-transition-fast, 150ms),
      box-shadow var(--settings-transition-fast, 150ms),
      transform var(--settings-transition-fast, 150ms);
  }

  .profile-card:hover {
    border-color: var(--nc-level-4, hsl(var(--border)));
    box-shadow: var(--settings-shadow-md, 0 4px 6px rgba(0, 0, 0, 0.07));
  }

  .profile-card.active {
    border-color: hsl(var(--settings-primary, 217 91% 60%));
    border-width: 2px;
    background: hsl(var(--settings-primary, 217 91% 60%) / 0.03);
  }

  .profile-card.active:hover {
    transform: scale(1.01);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
  }

  .profile-icon {
    font-size: 20px;
    line-height: 1;
  }

  .profile-name {
    flex: 1;
    font-size: var(--settings-font-size-base, 14px);
    font-weight: 600;
    color: var(--nc-palette-text, hsl(var(--foreground)));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.active-badge) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px !important;
    font-size: 10px !important;
    background: hsl(var(--settings-success, 160 84% 39%)) !important;
    color: white !important;
  }

  .profile-description {
    margin: 0;
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    line-height: 1.4;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: var(--settings-space-sm, 8px);
    margin-top: auto;
    padding-top: var(--settings-space-sm, 8px);
  }

  .current-label {
    font-size: var(--settings-font-size-xs, 11px);
    color: var(--nc-fg-muted, hsl(var(--muted-foreground)));
    flex: 1;
  }

  :global(.delete-btn) {
    color: hsl(var(--settings-error, 0 84% 60%)) !important;
    margin-left: auto;
  }

  :global(.delete-btn:hover) {
    background: hsl(var(--settings-error, 0 84% 60%) / 0.1) !important;
  }
</style>


