use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum GitFileStatus {
    Modified,
    Added,
    Deleted,
    Renamed { old_path: String },
    Copied { source: String },
    Conflicted,
    Untracked,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GitFileChange {
    pub path: String,
    pub status: GitFileStatus,
    pub staged: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GitRepositoryStatus {
    pub repository_path: String,
    pub current_branch: Option<String>,
    pub is_detached: bool,
    pub ahead: u32,
    pub behind: u32,
    pub staged_changes: Vec<GitFileChange>,
    pub changes: Vec<GitFileChange>,
    pub untracked: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CommitInfo {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub parent_hashes: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GitDiff {
    pub path: String,
    pub old_content: String,
    pub new_content: String,
    pub language: String,
    pub binary: bool,
}
