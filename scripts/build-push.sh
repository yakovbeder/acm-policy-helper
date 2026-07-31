#!/usr/bin/env bash
# Build and push the app image tagged with package.json version and latest.
# Usage:
#   ./scripts/build-push.sh           # build + push
#   ./scripts/build-push.sh --deploy  # build + push + deploy/install.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
IMAGE_REPO="${IMAGE_REPO:-quay.io/rh-ee-ybeder/acm-policy-helper}"
VERSION_IMAGE="${IMAGE_REPO}:${VERSION}"
LATEST_IMAGE="${IMAGE_REPO}:latest"
DEPLOY=0

for arg in "$@"; do
  case "${arg}" in
    --deploy) DEPLOY=1 ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      exit 1
      ;;
  esac
done

echo "Building ${VERSION_IMAGE} and ${LATEST_IMAGE}..."
podman build \
  -t "${VERSION_IMAGE}" \
  -t "${LATEST_IMAGE}" \
  "${ROOT}"

echo "Pushing ${VERSION_IMAGE}..."
podman push "${VERSION_IMAGE}"
echo "Pushing ${LATEST_IMAGE}..."
podman push "${LATEST_IMAGE}"

echo "Published ${VERSION_IMAGE} (and latest)."

if [[ "${DEPLOY}" -eq 1 ]]; then
  echo "Deploying ${LATEST_IMAGE}..."
  IMAGE="${LATEST_IMAGE}" "${ROOT}/deploy/install.sh"
fi
