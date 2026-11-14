#!/usr/bin/env bash
# Runs the Playwright suite inside the official Playwright image, so that screenshots are rendered
# by the same browser build, fonts and software rasteriser on every machine and in CI.
# Arguments are forwarded to `playwright test`, for example: tools/e2e-container.sh --update-snapshots
set -euo pipefail

readonly image="mcr.microsoft.com/playwright:v1.65.1-noble"
readonly pnpm_version="12.18.0"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly repo_root

# Dependencies are installed into a named volume: the host node_modules may target another platform.
# Files written to the bind mount are handed back to the invoking user when the container exits.
docker run --rm --ipc=host \
  --env CI \
  --env HOST_UID="$(id -u)" \
  --env HOST_GID="$(id -g)" \
  --env PNPM_VERSION="${pnpm_version}" \
  --volume "${repo_root}:/work" \
  --volume titanic-4d-e2e-node-modules:/work/node_modules \
  --workdir /work \
  "${image}" \
  bash -euo pipefail -c '
    restore_ownership() {
      chown -R "${HOST_UID}:${HOST_GID}" dist test-results playwright-report tests/e2e/__screenshots__ 2>/dev/null || true
    }
    trap restore_ownership EXIT
    npm install --global "pnpm@${PNPM_VERSION}"
    pnpm install --frozen-lockfile
    pnpm build
    pnpm exec playwright test "$@"
  ' -- "$@"
