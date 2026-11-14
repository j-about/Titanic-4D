#!/usr/bin/env bash
# Runs the Playwright suite inside the official Playwright image, so that screenshots are rendered
# by the same browser build, fonts and software rasteriser on every machine and in CI.
# Arguments are forwarded to `playwright test`, for example: tools/e2e-container.sh --update-snapshots
#
# By default the suite builds the application and serves it with `vite preview`. When E2E_BASE_URL
# is set, the suite runs against that origin instead (for example the production image listening
# on http://127.0.0.1:8080), and the test container shares the network of the host to reach it.
set -euo pipefail

readonly image="mcr.microsoft.com/playwright:v1.65.1-noble"
readonly pnpm_version="12.18.0"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly repo_root

network_arguments=()
if [[ -n "${E2E_BASE_URL:-}" ]]; then
  network_arguments=(--network host)
fi

# Dependencies are installed into a named volume: the host node_modules may target another platform.
# Files written to the bind mount are handed back to the invoking user when the container exits.
docker run --rm --ipc=host \
  ${network_arguments[@]+"${network_arguments[@]}"} \
  --env CI \
  --env E2E_BASE_URL \
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
    if [[ -z "${E2E_BASE_URL:-}" ]]; then
      pnpm build
    fi
    pnpm exec playwright test "$@"
  ' -- "$@"
