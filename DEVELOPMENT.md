# Development

Local development, tests, and image release notes for ACM Policy Helper.

## Architecture

```
Browser → OpenShift Route → ose-oauth-proxy-rhel9 → ACM Policy Helper (Express + React)
                                                      └─ PolicyGenerator binary
```

Image base: `registry.access.redhat.com/ubi9/nodejs-22` with PolicyGenerator v1.19.0 embedded.

## Local development

Requirements: Node.js 22+, optionally a local `PolicyGenerator` binary.

```bash
npm install

# Optional: PolicyGenerator for /api/generate and e2e
npm run download:pg
export POLICY_GENERATOR_BIN="$PWD/e2e/bin/PolicyGenerator"

npm run dev
```

- UI: http://localhost:5173 (Vite proxies `/api` to the backend)
- API: http://localhost:8080

See [API.md](API.md) for endpoints.

## Tests

```bash
npm test

npm run build
npm run install:browsers -w e2e
POLICY_GENERATOR_BIN="$PWD/e2e/bin/PolicyGenerator" npm run test:e2e

# Optional: generate + apply every built-in template to a live hub (disabled/inform).
# Requires `oc` login and PolicyGenerator. Skipped unless RUN_CLUSTER_TESTS=1.
npm run download:pg
npm run test:cluster
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs unit + e2e on push/PR. Container images are built and pushed locally (or from your registry pipeline), not from GitHub Actions.

## Image versioning and release

Container tags follow the root [`package.json`](package.json) `version` field (for example `1.2.0`). Every release also updates `:latest`.

Install/deploy on the cluster always uses **`:latest`** unless `IMAGE` is set (see [README.md](README.md)).

Release flow:

1. Bump `version` in the root `package.json` (and workspaces if needed)
2. Build and push `:version` and `:latest`:

   ```bash
   ./scripts/build-push.sh
   # or
   npm run image:build-push
   ```

3. Deploy (pulls latest):

   ```bash
   ./deploy/install.sh
   ```

Or build, push, and deploy in one step:

```bash
./scripts/build-push.sh --deploy
# or
npm run image:release
```

Custom registry/org:

```bash
IMAGE_REPO=quay.io/<org>/acm-policy-helper ./scripts/build-push.sh --deploy
```

### Install behavior

`./deploy/install.sh` defaults to `quay.io/rh-ee-ybeder/acm-policy-helper:latest`, sets the deployment image, and runs `oc rollout restart` so a new digest under `:latest` is always pulled. The app container uses `imagePullPolicy: Always`.
