use std::{fs, path::Path};

use git2::Repository;

use crate::git::{repository::open_repository, types::GitDiff, GitResult};

pub fn working_diff(repo_root: &Path, path: &str) -> GitResult<GitDiff> {
    let repo = open_repository(repo_root)?;
    let path_obj = Path::new(path);
    let head_content = read_head_file(&repo, path_obj).unwrap_or_default();
    let work_content = read_workdir_file(repo_root, path_obj).unwrap_or_default();

    let binary = head_content.1 || work_content.1;

    Ok(GitDiff {
        path: path.to_string(),
        old_content: head_content.0,
        new_content: work_content.0,
        language: language_from_path(path_obj),
        binary,
    })
}

pub fn staged_diff(repo_root: &Path, path: &str) -> GitResult<GitDiff> {
    let repo = open_repository(repo_root)?;
    let path_obj = Path::new(path);
    let head_content = read_head_file(&repo, path_obj).unwrap_or_default();
    let index_content = read_index_file(&repo, path_obj).unwrap_or_default();
    let binary = head_content.1 || index_content.1;

    Ok(GitDiff {
        path: path.to_string(),
        old_content: head_content.0,
        new_content: index_content.0,
        language: language_from_path(path_obj),
        binary,
    })
}

fn read_head_file(repo: &Repository, path: &Path) -> Option<(String, bool)> {
    let head = repo.head().ok()?;
    let tree = head.peel_to_tree().ok()?;
    let entry = tree.get_path(path).ok()?;
    let blob = repo.find_blob(entry.id()).ok()?;
    Some(decode_bytes(blob.content()))
}

fn read_index_file(repo: &Repository, path: &Path) -> Option<(String, bool)> {
    let index = repo.index().ok()?;
    let entry = index.get_path(path, 0)?;
    let blob = repo.find_blob(entry.id).ok()?;
    Some(decode_bytes(blob.content()))
}

fn read_workdir_file(repo_root: &Path, path: &Path) -> Option<(String, bool)> {
    let abs = repo_root.join(path);
    let data = fs::read(abs).ok()?;
    Some(decode_bytes(&data))
}

fn decode_bytes(bytes: &[u8]) -> (String, bool) {
    if bytes.is_empty() {
        return (String::new(), false);
    }
    let looks_binary = bytes.contains(&0);
    match String::from_utf8(bytes.to_vec()) {
        Ok(text) => (text, looks_binary),
        Err(_) => (String::from_utf8_lossy(bytes).into_owned(), true),
    }
}

fn language_from_path(path: &Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            match ext.to_lowercase().as_str() {
                "rs" => "rust",
                "ts" | "tsx" => "typescript",
                "js" | "jsx" => "javascript",
                "json" => "json",
                "toml" => "toml",
                "md" => "markdown",
                "yml" | "yaml" => "yaml",
                "css" => "css",
                "html" => "html",
                other => other,
            }
            .to_string()
        })
        .unwrap_or_else(|| "plaintext".to_string())
}
