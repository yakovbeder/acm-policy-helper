# ACM Policy Helper

Web UI that helps customers generate Open Cluster Management (ACM) Configuration Policies from Kubernetes YAML manifests using the [PolicyGenerator](https://github.com/open-cluster-management-io/policy-generator-plugin) (v1.19.0).

The tool produces:

- `Policy` (wrapping a `ConfigurationPolicy`)
- `Placement`
- `PlacementBinding`
- `ManagedClusterSetBinding` (when targeting ManagedClusterSets)

Deployed on OpenShift behind an official OAuth proxy so visiting the Route presents the OpenShift login page.

## Features

- PatternFly v6 wizard matching ACM Governance policy fields
- Built-in template gallery (operators and cluster config)
- Paste YAML or upload `.yaml` / `.yml` files
- Inline YAML linting in the editor
- Dark / light theme toggle
- Download generated YAML or apply it to the hub cluster
- Red Hat UBI 9 Node.js container image

## Policy templates

Built-in templates are curated starter manifests bundled with the app. They were adapted from public policy collections:

- [bry-tam/acm-policy-samples](https://github.com/bry-tam/acm-policy-samples)
- [open-cluster-management-io/policy-collection](https://github.com/open-cluster-management-io/policy-collection)
- [ch-stark/etcd-backup-policy](https://github.com/ch-stark/etcd-backup-policy)

Templates are install- or config-focused starters. Review and adjust names, placement, channels, and any site-specific values before applying to a cluster.

## Architecture

```
Browser → OpenShift Route → ose-oauth-proxy-rhel9 → ACM Policy Helper (Express + React)
                                                      └─ PolicyGenerator binary
```

## Deploy on OpenShift (recommended)

Requires `oc` logged into a cluster that can pull:

- App image: `quay.io/rh-ee-ybeder/acm-policy-helper:<version>` (version from root `package.json`; `latest` is also published)
- OAuth proxy: `registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v4.20` (cluster pull secret / entitlement)

### Image versioning

Container tags follow the root [`package.json`](package.json) `version` field (for example `1.2.0`). Release flow:

1. Bump `version` in the root `package.json` when you cut a release
2. Build and push `:version` and `:latest`: `./scripts/build-push.sh` (or `npm run image:build-push`)
3. Deploy that version: `./deploy/install.sh` (defaults to `quay.io/rh-ee-ybeder/acm-policy-helper:<version>`)

Or build, push, and deploy in one step: `./scripts/build-push.sh --deploy` (or `npm run image:release`).

### Install

```bash
./deploy/install.sh
```

Optional: override the image (repo or tag):

```bash
IMAGE=quay.io/rh-ee-ybeder/acm-policy-helper:<tag> ./deploy/install.sh
```

The script creates the namespace, oauth-proxy session secret, applies `deploy/` manifests, sets the image, waits for rollout, and prints the Route URL.

Open that URL in a browser. You are redirected to the **OpenShift OAuth** login page; after authentication the UI loads.

### Manual deploy

```bash
oc apply -f deploy/namespace.yaml

SESSION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
oc create secret generic acm-policy-helper-proxy \
  -n acm-policy-helper \
  --from-literal=session_secret="$SESSION_SECRET" \
  --dry-run=client -o yaml | oc apply -f -

oc apply -k deploy/
```

Then open the Route:

```bash
oc get route acm-policy-helper -n acm-policy-helper \
  -o jsonpath='https://{.spec.host}{"\n"}'
```

### RBAC

The app ServiceAccount can create/update:

- `policies`, `placementbindings` (`policy.open-cluster-management.io`)
- `placements`, `managedclustersetbindings` (`cluster.open-cluster-management.io`)

Authenticated users need permission to `get` the `acm-policy-helper` Service (oauth-proxy SAR). The install manifests include a RoleBinding for `system:authenticated`.

TLS uses the OpenShift service CA (`service.beta.openshift.io/serving-cert-secret-name`), a reencrypt Route, and oauth-proxy with the cluster trusted CA bundle (`ocp-injected-certs`).

### Usage

1. **Policy settings** — name, namespace, remediation, severity, compliance type, annotations
2. **Placement** — cluster label selectors **or** ManagedClusterSets (+ matchExpressions)
3. **Manifests** — paste or upload the YAML resources to wrap
4. **Review & apply** — preview generated YAML, download, copy, or apply to the hub

---

## Alternative: build and push your own image

Use this if you want a custom registry or org. Tags still come from root `package.json` version:

```bash
IMAGE_REPO=quay.io/<org>/acm-policy-helper ./scripts/build-push.sh --deploy
```

The image is based on `registry.access.redhat.com/ubi9/nodejs-22` and embeds PolicyGenerator v1.19.0.

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs unit + e2e tests on push/PR. Build and push the container image locally (or from your registry pipeline), not from GitHub Actions.

---

## Alternative: local development

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

### Tests

```bash
npm test

npm run build
npm run install:browsers -w e2e
POLICY_GENERATOR_BIN="$PWD/e2e/bin/PolicyGenerator" npm run test:e2e

# Optional: generate + apply every built-in template to a live hub (disabled/inform)
# Requires `oc` login (e.g. ocp4) and PolicyGenerator
npm run download:pg
npm run test:cluster
```

### Local API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/generate` | Form JSON → `{ "yaml": "..." }` |
| `POST` | `/api/apply` | `{ "yaml": "..." }` applied with the ServiceAccount (in-cluster) |
| `GET` | `/api/namespaces` | List hub namespaces for the policy namespace picker |
| `GET` | `/api/cluster-sets` | List ManagedClusterSets for placement targeting |
| `GET` | `/api/cluster-labels` | List ManagedCluster label keys/values for selectors |
| `GET` | `/api/health` | Health check / probes |

## License

Apache-2.0
