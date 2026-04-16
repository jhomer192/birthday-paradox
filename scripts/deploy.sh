#!/usr/bin/env bash
# Deploy the production build to the `gh-pages` branch on origin.
# Usage: bash scripts/deploy.sh
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "→ Building production bundle..."
npm run build

WORKTREE_DIR="$(mktemp -d)"
trap 'git worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true; rm -rf "$WORKTREE_DIR"' EXIT

echo "→ Preparing gh-pages worktree at $WORKTREE_DIR"
git worktree add -B gh-pages "$WORKTREE_DIR" --no-checkout

(
  cd "$WORKTREE_DIR"
  git rm -rf . >/dev/null 2>&1 || true
  cp -r "$REPO_ROOT/dist/." .
  touch .nojekyll
  git add -A
  if git diff --cached --quiet; then
    echo "→ Nothing to deploy."
    exit 0
  fi
  git commit -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  # gh-pages is a build-output branch; force-push so local worktree wins.
  git push -u --force origin gh-pages
)

echo "→ Done. Live at https://jhomer192.github.io/birthday-paradox/"
