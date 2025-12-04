use std::path::{Path, PathBuf};

use git2::{Repository, RepositoryInitOptions};

use crate::git::{GitError, GitResult};

pub fn detect_repository(root: &Path) -> GitResult<Option<PathBuf>> {
    match Repository::discover(root) {
        Ok(repo) => Ok(repo.workdir().map(|p| p.to_path_buf())),
        Err(err) => {
            if err.class() == git2::ErrorClass::Repository
                && err.code() == git2::ErrorCode::NotFound
            {
                Ok(None)
            } else {
                Err(GitError::from(err))
            }
        }
    }
}

pub fn init_repository(root: &Path) -> GitResult<PathBuf> {
    let mut opts = RepositoryInitOptions::new();
    opts.initial_head("main");
    let repo = Repository::init_opts(root, &opts)?;
    repo.workdir()
        .map(|p| p.to_path_buf())
        .ok_or(GitError::NoRepository)
}

pub fn open_repository(root: &Path) -> GitResult<Repository> {
    Repository::open(root).map_err(GitError::from)
}
