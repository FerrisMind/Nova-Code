use std::{fs, path::Path};

use git2::{build::CheckoutBuilder, IndexAddOption, Repository};

use crate::git::{repository::open_repository, status::collect_status, GitError, GitResult};

pub fn stage_file(repo_root: &Path, path: &str) -> GitResult<()> {
    let repo = open_repository(repo_root)?;
    let mut index = repo.index()?;
    index.add_path(Path::new(path))?;
    index.write()?;
    Ok(())
}

pub fn unstage_file(repo_root: &Path, path: &str) -> GitResult<()> {
    let repo = open_repository(repo_root)?;
    repo.reset_default(None, [Path::new(path)])?;
    Ok(())
}

pub fn stage_all(repo_root: &Path) -> GitResult<u32> {
    let repo = open_repository(repo_root)?;
    let before = staged_count(&repo)?;
    let mut index = repo.index()?;
    index.add_all(["*"], IndexAddOption::DEFAULT, None)?;
    index.write()?;
    let after = staged_count(&repo)?;
    Ok(after.saturating_sub(before))
}

pub fn unstage_all(repo_root: &Path) -> GitResult<u32> {
    let repo = open_repository(repo_root)?;
    let before = staged_count(&repo)?;
    repo.reset_default(None, std::iter::empty::<&Path>())?;
    Ok(before)
}

pub fn discard_changes(repo_root: &Path, paths: &[String]) -> GitResult<()> {
    let repo = open_repository(repo_root)?;
    for path in paths {
        let path_obj = Path::new(path);
        let status = repo.status_file(path_obj)?;
        if status.is_wt_new() {
            let abs = repo_root.join(path_obj);
            if abs.exists() {
                if abs.is_dir() {
                    fs::remove_dir_all(&abs)?;
                } else {
                    fs::remove_file(&abs)?;
                }
            }
            continue;
        }

        // Reset index for path to HEAD then checkout working tree.
        repo.reset_default(None, [path_obj])?;
        let mut checkout = CheckoutBuilder::new();
        checkout.path(path_obj).force();
        repo.checkout_head(Some(&mut checkout))?;
    }
    Ok(())
}

pub fn commit_staged(repo_root: &Path, message: &str) -> GitResult<String> {
    if message.trim().is_empty() {
        return Err(GitError::InvalidInput(
            "Commit message must not be empty".to_string(),
        ));
    }

    let repo = open_repository(repo_root)?;
    let mut index = repo.index()?;

    if index.is_empty() {
        return Err(GitError::InvalidInput(
            "No staged changes to commit".to_string(),
        ));
    }

    let tree_oid = index.write_tree()?;
    let tree = repo.find_tree(tree_oid)?;
    let signature = repo.signature()?;

    let head = repo.head().ok();
    let parents = if let Some(head_ref) = head {
        if let Some(oid) = head_ref.target() {
            vec![repo.find_commit(oid)?]
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
    let commit_oid = repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        message,
        &tree,
        &parent_refs,
    )?;
    Ok(commit_oid.to_string())
}

fn staged_count(repo: &Repository) -> GitResult<u32> {
    let status = collect_status(repo.workdir().ok_or(GitError::NoRepository)?)?;
    Ok(status.staged_changes.len() as u32)
}
