#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="${NAMESPACE:-acm-policy-helper}"
IMAGE_REPO="${IMAGE_REPO:-quay.io/rh-ee-ybeder/acm-policy-helper}"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
IMAGE="${IMAGE:-${IMAGE_REPO}:${VERSION}}"

echo "Creating namespace ${NAMESPACE}..."
oc apply -f "$(dirname "$0")/namespace.yaml"

if ! oc get secret acm-policy-helper-proxy -n "${NAMESPACE}" >/dev/null 2>&1; then
  SESSION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
  echo "Creating oauth-proxy session secret..."
  oc create secret generic acm-policy-helper-proxy \
    -n "${NAMESPACE}" \
    --from-literal=session_secret="${SESSION_SECRET}"
else
  echo "oauth-proxy session secret already exists"
fi

echo "Applying manifests with image ${IMAGE}..."
oc apply -k "$(dirname "$0")"
oc set image deployment/acm-policy-helper \
  acm-policy-helper="${IMAGE}" \
  -n "${NAMESPACE}"

echo "Waiting for rollout..."
oc rollout status deployment/acm-policy-helper -n "${NAMESPACE}" --timeout=180s

echo
echo "Route:"
oc get route acm-policy-helper -n "${NAMESPACE}" \
  -o jsonpath='https://{.spec.host}{"\n"}'
echo
echo "Open the Route URL. You will be redirected to the OpenShift OAuth login page."
