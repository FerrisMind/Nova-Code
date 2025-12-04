use std::{
    path::PathBuf,
    sync::{mpsc, Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use notify::{event::Event, recommended_watcher, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

pub mod diff;
pub mod history;
pub mod ops;
pub mod repository;
pub mod status;
pub mod types;

pub const STATUS_CACHE_TTL: Duration = Duration::from_secs(5);
const STATUS_EVENT_DEBOUNCE: Duration = Duration::from_millis(500);

pub type GitResult<T> = Result<T, GitError>;

#[derive(Debug)]
pub enum GitError {
    NoRepository,
    Git(String),
    Io(String),
    InvalidInput(String),
    Notify(String),
}

impl From<git2::Error> for GitError {
    fn from(value: git2::Error) -> Self {
        GitError::Git(value.message().to_string())
    }
}

impl From<std::io::Error> for GitError {
    fn from(value: std::io::Error) -> Self {
        GitError::Io(value.to_string())
    }
}

impl From<notify::Error> for GitError {
    fn from(value: notify::Error) -> Self {
        GitError::Notify(value.to_string())
    }
}

#[derive(Clone, Default)]
pub struct GitState {
    repository_root: Arc<Mutex<Option<PathBuf>>>,
    status_cache: Arc<Mutex<Option<types::GitRepositoryStatus>>>,
    cache_timestamp: Arc<Mutex<Option<Instant>>>,
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    watched_root: Arc<Mutex<Option<PathBuf>>>,
    last_emit: Arc<Mutex<Option<Instant>>>,
}

impl GitState {
    pub fn set_repository_root(&self, root: Option<PathBuf>) {
        {
            let mut guard = self.repository_root.lock().expect("repo_root poisoned");
            *guard = root;
        }
        self.invalidate_status_cache();
    }

    pub fn repository_root(&self) -> Option<PathBuf> {
        self.repository_root
            .lock()
            .expect("repo_root poisoned")
            .clone()
    }

    pub fn get_cached_status(&self) -> Option<types::GitRepositoryStatus> {
        let now = Instant::now();
        let ts = *self.cache_timestamp.lock().expect("cache ts poisoned");
        if let Some(updated_at) = ts {
            if now.duration_since(updated_at) <= STATUS_CACHE_TTL {
                return self.status_cache.lock().expect("cache poisoned").clone();
            }
        }
        None
    }

    pub fn store_status_cache(&self, status: types::GitRepositoryStatus) {
        *self.status_cache.lock().expect("cache poisoned") = Some(status);
        *self.cache_timestamp.lock().expect("cache ts poisoned") = Some(Instant::now());
    }

    pub fn invalidate_status_cache(&self) {
        *self.status_cache.lock().expect("cache poisoned") = None;
        *self.cache_timestamp.lock().expect("cache ts poisoned") = None;
    }

    pub fn ensure_watcher(&self, app: &AppHandle) -> GitResult<()> {
        let repo_root = match self.repository_root() {
            Some(root) => root,
            None => {
                self.drop_watcher();
                return Ok(());
            }
        };

        {
            let watched = self.watched_root.lock().expect("watched_root poisoned");
            if watched.as_ref() == Some(&repo_root) {
                return Ok(());
            }
        }

        self.drop_watcher();

        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();
        let mut watcher = recommended_watcher(move |res| {
            let _ = tx.send(res);
        })?;
        watcher.watch(&repo_root, RecursiveMode::Recursive)?;

        let handle = app.clone();
        let state_for_thread = self.clone();
        thread::spawn(move || {
            while let Ok(event_result) = rx.recv() {
                if event_result.is_ok() {
                    state_for_thread.invalidate_status_cache();
                    state_for_thread.emit_status_changed(&handle);
                }
            }
        });

        *self.watched_root.lock().expect("watched_root poisoned") = Some(repo_root);
        *self.watcher.lock().expect("watcher poisoned") = Some(watcher);
        Ok(())
    }

    pub fn emit_status_changed(&self, app: &AppHandle) {
        let now = Instant::now();
        let mut last_emit = self.last_emit.lock().expect("last_emit poisoned");
        if let Some(prev) = *last_emit {
            if now.duration_since(prev) < STATUS_EVENT_DEBOUNCE {
                return;
            }
        }
        *last_emit = Some(now);
        let _ = app.emit("git-status-changed", ());
    }

    fn drop_watcher(&self) {
        *self.watcher.lock().expect("watcher poisoned") = None;
        *self.watched_root.lock().expect("watched_root poisoned") = None;
    }
}

pub use diff::{staged_diff, working_diff};
pub use history::read_history;
pub use ops::{commit_staged, discard_changes, stage_all, stage_file, unstage_all, unstage_file};
pub use repository::{detect_repository, init_repository};
pub use status::{collect_status, file_statuses};
