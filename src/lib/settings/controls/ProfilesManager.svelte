<svelte:options runes={true} />
<script lang="ts">
  /**
   * ProfilesManager.svelte
   * Компонент для управления профилями настроек
   * 
   * Функционал:
   * - Создание нового профиля из текущих настроек
   * - Переключение между профилями
   * - Удаление профилей
   * - Редактирование названия и иконки профиля
   */
  
  import { settingsProfilesStore } from '$lib/stores/settingsProfilesStore';
  import Icon from '$lib/common/Icon.svelte';
  
  let {
    onclose,
    onprofileselected
  }: {
    onclose?: () => void;
    onprofileselected?: (detail: { profileId: string }) => void;
  } = $props();

  interface ProfilesState {
    profiles: any[];
    activeProfileId: string | null;
    loading: boolean;
    error: string | null;
  }

  let profilesState: any = $state({ profiles: [], activeProfileId: null, loading: false, error: null });
  let showCreateDialog = $state(false);
  let newProfileName = $state('');
  let newProfileIcon = $state('lucide:User');
  let isProcessing = $state(false);

  // Подписка на изменения
  const unsubscribe = settingsProfilesStore.subscribe((value) => {
    profilesState = value;
  });

  // Очистка при размонтировании
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubscribe();
  });

  // Иконки для выбора
  const availableIcons = [
    'lucide:User',
    'lucide:Briefcase',
    'lucide:Home',
    'lucide:Code',
    'lucide:Gamepad2',
    'lucide:Sparkles',
    'lucide:Heart',
    'lucide:Star'
  ];

  async function createProfile() {
    if (!newProfileName.trim() || isProcessing) return;

    isProcessing = true;
    try {
      await settingsProfilesStore.createProfileFromCurrent({
        label: newProfileName.trim(),
        icon: newProfileIcon
      });
      
      newProfileName = '';
      newProfileIcon = 'lucide:User';
      showCreateDialog = false;
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function switchProfile(profileId: string) {
    if (isProcessing) return;

    isProcessing = true;
    try {
      await settingsProfilesStore.applyProfile(profileId);
      onprofileselected?.({ profileId });
    } catch (error) {
      console.error('Failed to switch profile:', error);
    } finally {
      isProcessing = false;
    }
  }

  async function deleteProfile(profileId: string, event: Event) {
    event.stopPropagation();
    
    if (isProcessing) return;

    const confirmed = confirm(`Удалить профиль?`);
    if (!confirmed) return;

    isProcessing = true;
    try {
      await settingsProfilesStore.deleteProfile(profileId);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    } finally {
      isProcessing = false;
    }
  }

  function openCreateDialog() {
    showCreateDialog = true;
  }

  function closeCreateDialog() {
    showCreateDialog = false;
    newProfileName = '';
    newProfileIcon = 'lucide:User';
  }

  function handleCreateDialogOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeCreateDialog();
    }
  }
</script>

<div class="profiles-manager">
  <div class="manager-header">
    <div class="header-content">
      <Icon name="lucide:Users" size={24} />
      <div>
        <h2>Профили настроек</h2>
        <p>Сохраняйте и переключайте наборы настроек</p>
      </div>
    </div>
    <button class="close-btn" onclick={() => onclose?.()}>
      <Icon name="lucide:X" size={20} />
    </button>
  </div>

  <div class="profiles-list">
    {#each profilesState.profiles as profile (profile.id)}
      <div
        class="profile-card {profilesState.activeProfileId === profile.id ? 'active' : ''}"
        role="button"
        tabindex="0"
        onclick={() => switchProfile(profile.id)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && switchProfile(profile.id)}
        aria-disabled={isProcessing}
      >
        <div class="profile-icon">
          <Icon name={profile.icon || 'lucide:User'} size={24} />
        </div>
        
        <div class="profile-info">
          <div class="profile-name">{profile.label}</div>
          <div class="profile-meta">
            {#if profilesState.activeProfileId === profile.id}
              <span class="badge active-badge">Активный</span>
            {/if}
            {#if profile.isDefault}
              <span class="badge default-badge">По умолчанию</span>
            {/if}
          </div>
        </div>

        {#if !profile.isDefault}
          <div 
            class="delete-btn-wrapper" 
            role="presentation"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
          >
            <button
              class="delete-btn"
              onclick={(e) => deleteProfile(profile.id, e)}
              title="Удалить профиль"
            >
              <Icon name="lucide:Trash2" size={16} />
            </button>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <button class="create-btn" onclick={openCreateDialog} disabled={isProcessing}>
    <Icon name="lucide:Plus" size={20} />
    <span>Создать новый профиль</span>
  </button>
</div>

<!-- Диалог создания профиля -->
{#if showCreateDialog}
  <div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleCreateDialogOverlayClick}
    onkeydown={(e) => e.key === 'Escape' && closeCreateDialog()}
  >
    <div 
      class="modal-content" 
      role="document"
    >
      <h3>Новый профиль</h3>
      <p class="modal-description">
        Создаст новый профиль с текущими настройками
      </p>

      <div class="form-group">
        <label for="profile-name">Название профиля</label>
        <input
          id="profile-name"
          type="text"
          class="text-input"
          bind:value={newProfileName}
          placeholder="Мой профиль"
          maxlength={50}
        />
      </div>

      <div class="form-group">
        <label for="profile-icon-select">Иконка</label>
        <div class="icon-grid" id="profile-icon-select">
          {#each availableIcons as iconName}
            <button
              class="icon-option {newProfileIcon === iconName ? 'selected' : ''}"
              onclick={() => newProfileIcon = iconName}
              type="button"
            >
              <Icon name={iconName} size={20} />
            </button>
          {/each}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick={closeCreateDialog}>
          Отмена
        </button>
        <button 
          class="btn btn-primary" 
          onclick={createProfile}
          disabled={!newProfileName.trim() || isProcessing}
        >
          Создать
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .profiles-manager {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--nc-bg);
  }

  .manager-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
    border-bottom: 1px solid var(--nc-border, rgba(255, 255, 255, 0.1));
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-content h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--nc-fg);
  }

  .header-content p {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: var(--nc-fg-muted);
  }

  .close-btn {
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--nc-fg-muted);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--nc-level-2);
    color: var(--nc-fg);
  }

  .profiles-list {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }

  .profile-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(
      135deg,
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.7),
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.5)
    );
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    text-align: left;
  }

  .profile-card:hover {
    background: rgba(var(--nc-level-2-rgb, 40, 40, 45), 0.8);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .profile-card.active {
    border-color: var(--nc-accent, #007ACC);
    background: linear-gradient(
      135deg,
      rgba(var(--nc-accent-rgb, 0, 122, 204), 0.1),
      rgba(var(--nc-level-1-rgb, 30, 30, 35), 0.7)
    );
  }

  .profile-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .profile-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--nc-level-2);
    color: var(--nc-accent);
    flex-shrink: 0;
  }

  .profile-card.active .profile-icon {
    background: var(--nc-accent);
    color: white;
  }

  .profile-info {
    flex: 1;
  }

  .profile-name {
    font-size: 16px;
    font-weight: 500;
    color: var(--nc-fg);
    margin-bottom: 4px;
  }

  .profile-meta {
    display: flex;
    gap: 8px;
  }

  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 500;
  }

  .active-badge {
    background: var(--nc-accent, #007ACC);
    color: white;
  }

  .default-badge {
    background: var(--nc-level-3);
    color: var(--nc-fg-muted);
  }

  .delete-btn-wrapper {
    display: flex;
    align-items: center;
  }

  .delete-btn {
    padding: 8px;
    border: none;
    background: transparent;
    color: var(--nc-fg-muted);
    cursor: pointer;
    border-radius: 6px;
    opacity: 0;
    transition: all 0.2s ease;
  }

  .profile-card:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .create-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 16px;
    padding: 12px 20px;
    border: 2px dashed rgba(255, 255, 255, 0.2);
    background: transparent;
    color: var(--nc-fg-muted);
    font-size: 14px;
    font-weight: 500;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-btn:hover:not(:disabled) {
    border-color: var(--nc-accent);
    color: var(--nc-accent);
    background: rgba(var(--nc-accent-rgb, 0, 122, 204), 0.05);
  }

  .create-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    background: var(--nc-level-1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s cubic-bezier(0.33, 0.02, 0.11, 0.99);
    pointer-events: none;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-content h3 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--nc-fg);
  }

  .modal-description {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: var(--nc-fg-muted);
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--nc-fg);
  }

  .text-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--nc-level-2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--nc-fg);
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    pointer-events: auto;
  }

  .text-input:focus {
    border-color: var(--nc-accent);
    background: var(--nc-level-3);
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .icon-option {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: var(--nc-level-2);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--nc-fg-muted);
    pointer-events: auto;
  }

  .icon-option:hover {
    background: var(--nc-level-3);
    color: var(--nc-fg);
  }

  .icon-option.selected {
    border-color: var(--nc-accent);
    background: rgba(var(--nc-accent-rgb, 0, 122, 204), 0.1);
    color: var(--nc-accent);
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    justify-content: flex-end;
    pointer-events: auto;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-secondary {
    background: var(--nc-level-2);
    color: var(--nc-fg);
  }

  .btn-secondary:hover {
    background: var(--nc-level-3);
  }

  .btn-primary {
    background: var(--nc-accent, #007ACC);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
