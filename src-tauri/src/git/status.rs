use std::path::Path;

use git2::{Branch, Repository, Status, StatusEntry, StatusOptions, StatusShow};

use crate::git::{
    repository::open_repository,
    types::{GitFileChange, GitFileStatus, GitRepositoryStatus},
    GitResult,
};

pub fn collect_status(repo_root: &Path) -> GitResult<GitRepositoryStatus> {
    let repo = open_repository(repo_root)?;
    let (branch, is_detached) = current_branch(&repo);
    let (ahead, behind) = ahead_behind(&repo);

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true)
        .renames_index_to_workdir(true)
        .show(StatusShow::IndexAndWorkdir);

    let statuses = repo.statuses(Some(&mut opts))?;

    let mut staged_changes = Vec::new();
    let mut changes = Vec::new();
    let mut untracked = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry
            .path()
            .map(|p| normalize_path(repo_root, p))
            .unwrap_or_else(|| "".to_string());

        if status.is_index_new() {
            staged_changes.push(change(path.clone(), GitFileStatus::Added, true));
        } else if status.is_index_modified() {
            staged_changes.push(change(path.clone(), GitFileStatus::Modified, true));
        } else if status.is_index_deleted() {
            staged_changes.push(change(path.clone(), GitFileStatus::Deleted, true));
        } else if status.is_index_renamed() {
            let old_path = rename_source(repo_root, &entry).unwrap_or_else(|| path.clone());
            staged_changes.push(change(
                path.clone(),
                GitFileStatus::Renamed { old_path },
                true,
            ));
        }

        if status.is_wt_new() {
            untracked.push(path.clone());
        } else if status.is_wt_modified() {
            changes.push(change(path.clone(), GitFileStatus::Modified, false));
        } else if status.is_wt_deleted() {
            changes.push(change(path.clone(), GitFileStatus::Deleted, false));
        } else if status.is_wt_renamed() {
            let old_path = rename_source_workdir(repo_root, &entry).unwrap_or_else(|| path.clone());
            changes.push(change(
                path.clone(),
                GitFileStatus::Renamed { old_path },
                false,
            ));
        } else if status.is_conflicted() {
            changes.push(change(path.clone(), GitFileStatus::Conflicted, false));
        }
    }

    untracked.sort();
    untracked.dedup();

    Ok(GitRepositoryStatus {
        repository_path: repo_root.to_string_lossy().replace('\\', "/"),
        current_branch: branch,
        is_detached,
        ahead,
        behind,
        staged_changes,
        changes,
        untracked,
    })
}

pub fn file_statuses(
    repo_root: &Path,
    paths: &[String],
) -> GitResult<Vec<(String, GitFileStatus)>> {
    let repo = open_repository(repo_root)?;
    let mut result = Vec::new();
    for path in paths {
        let status = repo.status_file(Path::new(path))?;
        let mapped = map_status_bits(status);
        result.push((path.clone(), mapped.unwrap_or(GitFileStatus::Modified)));
    }
    Ok(result)
}

fn map_status_bits(status: Status) -> Option<GitFileStatus> {
    if status.is_index_new() || status.is_wt_new() {
        Some(GitFileStatus::Untracked)
    } else if status.is_index_deleted() || status.is_wt_deleted() {
        Some(GitFileStatus::Deleted)
    } else if status.is_index_renamed() || status.is_wt_renamed() {
        Some(GitFileStatus::Renamed {
            old_path: "".to_string(),
        })
    } else if status.is_conflicted() {
        Some(GitFileStatus::Conflicted)
    } else if status.is_index_modified() || status.is_wt_modified() {
        Some(GitFileStatus::Modified)
    } else {
        None
    }
}

fn normalize_path(root: &Path, repo_relative: &str) -> String {
    let abs = root.join(repo_relative);
    abs.strip_prefix(root)
        .unwrap_or(&abs)
        .to_string_lossy()
        .replace('\\', "/")
}

fn rename_source(root: &Path, entry: &StatusEntry) -> Option<String> {
    entry
        .head_to_index()
        .and_then(|delta| delta.old_file().path())
        .and_then(|p| p.to_str().map(|s| normalize_path(root, s)))
}

fn rename_source_workdir(root: &Path, entry: &StatusEntry) -> Option<String> {
    entry
        .index_to_workdir()
        .and_then(|delta| delta.old_file().path())
        .and_then(|p| p.to_str().map(|s| normalize_path(root, s)))
}

fn change(path: String, status: GitFileStatus, staged: bool) -> GitFileChange {
    GitFileChange {
        path,
        status,
        staged,
    }
}

fn current_branch(repo: &Repository) -> (Option<String>, bool) {
    match repo.head() {
        Ok(head) if head.is_branch() => {
            let name = head.shorthand().map(|s| s.to_string());
            (name, false)
        }
        Ok(_) => (None, true),
        Err(_) => (None, true),
    }
}

fn ahead_behind(repo: &Repository) -> (u32, u32) {
    if let Ok(head_ref) = repo.head() {
        let local_oid = head_ref.target();
        if let Ok(branch) = Branch::wrap(head_ref).upstream() {
            let upstream_ref = branch.into_reference();
            if let (Some(local_oid), Some(upstream_oid)) = (local_oid, upstream_ref.target()) {
                if let Ok((ahead, behind)) = repo.graph_ahead_behind(local_oid, upstream_oid) {
                    return (
                        ahead.try_into().unwrap_or(u32::MAX),
                        behind.try_into().unwrap_or(u32::MAX),
                    );
                }
            }
        }
    }
    (0, 0)
}
