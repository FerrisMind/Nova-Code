use std::path::Path;

use git2::Sort;

use crate::git::{repository::open_repository, types::CommitInfo, GitResult};

pub fn read_history(repo_root: &Path, offset: u32, limit: u32) -> GitResult<Vec<CommitInfo>> {
    let repo = open_repository(repo_root)?;
    let mut revwalk = repo.revwalk()?;

    if revwalk.push_head().is_err() {
        return Ok(Vec::new());
    }
    revwalk.set_sorting(Sort::TIME | Sort::REVERSE)?;

    let commits = revwalk
        .skip(offset as usize)
        .take(limit as usize)
        .filter_map(|oid_res| oid_res.ok())
        .filter_map(|oid| repo.find_commit(oid).ok())
        .map(|commit| {
            let author = commit.author();
            CommitInfo {
                hash: commit.id().to_string(),
                short_hash: commit.id().to_string()[..7.min(commit.id().to_string().len())]
                    .to_string(),
                message: commit.summary().unwrap_or("No message").to_string(),
                author_name: author.name().unwrap_or("Unknown").to_string(),
                author_email: author.email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                parent_hashes: commit.parent_ids().map(|id| id.to_string()).collect(),
            }
        })
        .collect();

    Ok(commits)
}
