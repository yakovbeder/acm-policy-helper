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
- Paste YAML or upload `.yaml` / `.yml` files
- Inline YAML linting in the editor
- Dark / light theme toggle
- Download generated YAML or apply it to the hub cluster
- Red Hat UBI 9 Node.js container image

## Architecture

```
Browser → OpenShift Route → ose-oauth-proxy-rhel9 → ACM Policy Helper (Express + React)
                                                      └─ PolicyGenerator binary
```

## Local development

Requirements: Node.js 20+, optionally a local `PolicyGenerator` binary.

```bash
# Install dependencies
npm install

# Optional: download PolicyGenerator for local generate testing
curl -L -o /tmp/PolicyGenerator \
  https://github.com/open-cluster-management-io/policy-generator-plugin/releases/download/v1.19.0/linux-amd64-PolicyGenerator
chmod +x /tmp/PolicyGenerator
export POLICY_GENERATOR_BIN=/tmp/PolicyGenerator

# Run API + UI
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:8080

## Build container image

```bash
podman build -t quay.io/<org>/acm-policy-helper:latest .
podman push quay.io/<org>/acm-policy-helper:latest
```

The image is based on `registry.access.redhat.com/ubi9/nodejs-20` and embeds PolicyGenerator v1.19.0.

## Deploy on OpenShift

1. Create the namespace and proxy cookie secret:

```bash
oc apply -f deploy/namespace.yaml

SESSION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
oc create secret generic acm-policy-helper-proxy \
  -n acm-policy-helper \
  --from-literal=session_secret="$SESSION_SECRET" \
  --dry-run=client -o yaml | oc apply -f -
```

2. Set your image in `deploy/kustomization.yaml` (or edit `deploy/deployment.yaml`).

3. Apply manifests:

```bash
oc apply -k deploy/
```

4. Wait for the serving cert secret (`acm-policy-helper-tls`) to be created by OpenShift, then check the Route:

```bash
oc get route acm-policy-helper -n acm-policy-helper
```

5. Open the Route URL. You should be redirected to the **OpenShift OAuth login** page. After authentication, the ACM Policy Helper UI loads.

### OAuth proxy image

The deployment uses:

```text
registry.redhat.io/openshift4/ose-oauth-proxy-rhel9:v4.20
```

Ensure the cluster can pull from `registry.redhat.io` (global pull secret / entitled pull). Link a pull secret to the `acm-policy-helper` ServiceAccount if needed.

### RBAC

The app ServiceAccount can create/update:

- `policies`, `placementbindings` (`policy.open-cluster-management.io`)
- `placements`, `managedclustersetbindings` (`cluster.open-cluster-management.io`)

## Usage

1. **Policy settings** — name, namespace, remediation, severity, compliance type, annotations fields
2. **Placement** — cluster label selectors **or** ManagedClusterSets (+ matchExpressions)
3. **Manifests** — paste or upload the YAML resources to wrap
4. **Review & apply** — preview generated YAML, download, copy, or apply to the cluster

## API

### `POST /api/generate`

Accepts policy form JSON and returns `{ "yaml": "..." }`.

### `POST /api/apply`

Accepts `{ "yaml": "..." }` and applies resources using the in-cluster ServiceAccount.

### `GET /api/health`

Health check (also used by probes; optionally skipped by oauth-proxy).

## License

Apache-2.0
