# Blastermailer Git/GitHub Commands

This document lists the custom shell commands used for branching, PRs, merges, and release promotion.

## Legacy `~/.zshrc` commands

### `ghpr`
- Creates a new branch from current branch.
- Creates an empty initial commit.
- Pushes branch to origin.
- Opens a PR assigned to current user.

### `ghpr_later`
- Creates/pushes a branch.
- Defers PR creation.

### `ghpr_create <branch> <base> [ticket]`
- Creates a PR later for an already pushed branch.

### `git_push_fn`
- Stages all changes (`git add .`), commits with prompted message, and pushes.

### `ghm [target_branch]`
- Non-PR direct merge helper:
- Switches to target branch (default `main`), pulls latest, merges current branch, pushes.
- Deletes current local and remote branch.

## Repository shortcut commands (`scripts/blastermailer-gh-shortcuts.zsh`)

Load shortcuts:

```bash
source ./scripts/blastermailer-gh-shortcuts.zsh
```

### `bm_gh_auth`
- Authenticates GitHub CLI token interactively.

### `bm_pr [base] [title] [body]`
- Creates PR from current branch to base branch (default `dev`).
- Pushes branch if not already remote.

### `bm_pr_hotfix [title] [body]`
- Shortcut for `bm_pr main ...`.

### `bm_pr_master [title] [body]`
- Alias of `bm_pr_hotfix`.

### `bm_pr_dev [title] [body]`
- Shortcut for `bm_pr dev ...`.

### `bm_merge_pr <pr> [merge|squash|rebase]`
- Merges PR and deletes branch.
- Default merge method: `squash`.

### `bm_merge_main <pr> [method]`
- Merges PR intended for `main` (default `merge` method).

### `bm_merge_master <pr> [method]`
- Alias for `bm_merge_main`.

### `bm_merge_dev <pr> [method]`
- Merges PR intended for `dev` (default `squash` method).

### `bm_cherrypick_to_release <pr> <release_branch>`
- After PR merged into `dev`, cherry-picks merge commit into release branch and pushes.

### `bm_merge_dev_and_cherrypick <pr> <release_branch> [method]`
- Merges PR into `dev`, then cherry-picks into release branch.

### `bm_promote_release <release_branch> [main_branch] [dev_branch]`
- Merges release branch into main branch.
- Then merges main branch back into dev branch.

### `bm_promote_release_master <release_branch>`
- Shortcut for `bm_promote_release <release_branch> main dev`.

### `bm_pr_checks <pr>`
- Displays status of PR checks.

### `bm_ci_watch`
- Watches latest running GitHub Actions workflow.

## Recommended release workflow

1. Create feature branch from `dev`.
2. Commit feature work.
3. Open PR to `dev` with `bm_pr_dev`.
4. Merge PR into `dev` after tests/approvals.
5. Cherry-pick merged PR to release branch with `bm_cherrypick_to_release`.
6. Promote release branch to `main`, then sync back to `dev` with `bm_promote_release`.
