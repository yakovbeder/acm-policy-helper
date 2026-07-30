#!/usr/bin/env bash
set -euo pipefail

VERSION="${POLICY_GENERATOR_VERSION:-v1.19.0}"
DEST_DIR="${1:-e2e/bin}"
ARCH="$(uname -m)"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"

case "${ARCH}" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Unsupported arch: ${ARCH}" >&2; exit 1 ;;
esac

ASSET="${OS}-${ARCH}-PolicyGenerator"
URL="https://github.com/open-cluster-management-io/policy-generator-plugin/releases/download/${VERSION}/${ASSET}"

mkdir -p "${DEST_DIR}"
OUT="${DEST_DIR}/PolicyGenerator"

echo "Downloading ${URL}"
curl -fsSL -o "${OUT}" "${URL}"
chmod +x "${OUT}"
echo "Installed ${OUT}"
"${OUT}" --help >/dev/null 2>&1 || true
