# Architecture

Quick map of the ACM Policy Helper codebase. Prefer this over rediscovering the tree each session.

For install/usage see [README.md](README.md). For local/dev/release see [DEVELOPMENT.md](DEVELOPMENT.md). For HTTP contracts see [API.md](API.md).

## What it does

Web UI that produces an ACM governance bundle from YAML manifests or built-in templates:

`Policy` (+ `ConfigurationPolicy`) + `Placement` + `PlacementBinding` (+ optional `ManagedClusterSetBinding`)

Generation uses the **PolicyGenerator** binary. Target ACM: **2.15–2.17**. App version lives in the four workspace `package.json` files (keep in sync).

## Runtime (OpenShift)

```
Browser
  → Route (TLS reencrypt)
    → ose-oauth-proxy-rhel9 :8443
      → Express + static React :8080
           └─ /usr/local/bin/PolicyGenerator
```

- OAuth login via OpenShift; `/api/health` skips auth.
- App SA applies resources and reads cluster catalogs (namespaces, ManagedClusters, console URL).
- `ConsoleLink` (Application launcher → Tools → ACM Policy Helper) is created by `deploy/install.sh`.

## Repo layout

| Path | Role |
|------|------|
| `frontend/` | Vite + React + PatternFly 6 wizard UI |
| `backend/` | Express API; serves built UI from `backend/public` |
| `e2e/` | Playwright tests |
| `deploy/` | Kustomize manifests + `install.sh` |
| `scripts/` | Image build/push, PolicyGenerator download, screenshots |
| `docs/screenshots/` | README screenshots (regenerate via `scripts/take-screenshots.mjs`) |
| `Dockerfile` | Multi-stage UBI9 Node 22 + embedded PolicyGenerator |
| `.github/workflows/ci.yml` | Unit + e2e (no image push) |

npm workspaces: `frontend`, `backend`, `e2e`. Root scripts: `dev`, `build`, `test`, `test:e2e`, `image:build-push`, `image:release`.

## End-to-end data flow

```
Template / blank
  → PolicyFormState (settings + placement + manifests)
      → [optional] GET /api/policies/:ns/:name  (exists?)
      → [optional] GET .../bundle + hydrate into form
  → POST /api/generate
      → write temp manifests + PolicyGenerator CR
      → exec PolicyGenerator
      → inject ManagedClusterSetBindings if clusterSets mode
      → { yaml }
  → Review (read-only Monaco)
      → Download / Copy
      → POST /api/apply { yaml }
      → on full success: GET /api/console-url
        → "View Policy in ACM"
           `${consoleUrl}/multicloud/governance/policies/details/${ns}/${name}`
```

Form edits clear generated YAML; user must hit **Generate** on Manifests again.

## Frontend (`frontend/src/`)

| Area | Path | Notes |
|------|------|-------|
| Shell | `App.tsx`, `main.tsx` | Masthead + theme |
| Wizard | `components/PolicyWizard/PolicyWizard.tsx` | Step orchestration |
| Steps | `TemplateStep`, `PolicySettingsStep`, `PlacementStep`, `ManifestsStep`, `ReviewStep` | Non-linear nav (ACM-like) |
| API client | `services/api.ts` | All `/api/*` calls |
| Hydrate | `services/policyHydrate.ts` | Hub bundle → form (edit existing) |
| Types | `types.ts` | `PolicyFormState`, `ApplyResult`, … |
| Templates | `templates/` | Built-ins: `cluster-config/`, `cluster-health/` |
| Hooks | `hooks/useClusterCatalog.ts`, `usePlacementTargets.ts`, `useTheme.ts` | Catalog + theme |
| YAML editor | `LazyYamlEditor.tsx` → `YamlEditor.tsx` (Monaco) | Editable on Manifests; read-only on Review |

**Wizard steps**

1. **Template** — blank or starter
2. **Policy settings** — name, namespace, remediation, severity, prune, standards; Next may open “Policy exists” modal
3. **Placement** — label selectors or ManagedClusterSets
4. **Manifests** — edit/paste/upload; primary action **Generate**
5. **Review & apply** — preview; Download / Copy / Apply; success link to ACM

Dev: Vite `:5173` proxies `/api` → `localhost:8080` (`frontend/vite.config.ts`).

## Backend (`backend/src/`)

| Area | Path | Notes |
|------|------|-------|
| Entry | `server.ts` | Routes + static SPA + health |
| Generate | `services/policyGenerator.ts` | Temp dir, exec PG binary, post-process |
| Cluster | `services/kubeClient.ts` | Apply YAML; namespaces/sets/labels/placement-targets/policies/console URL |
| Types | `types.ts` | Shared request/response shapes |
| Routes | `routes/*.ts` | Thin handlers (see [API.md](API.md)) |

**Routes**

| Method | Path | Service |
|--------|------|---------|
| GET | `/api/health` | inline |
| POST | `/api/generate` | `policyGenerator` |
| POST | `/api/apply` | `kubeClient.applyYaml` (207 on partial failure) |
| GET | `/api/namespaces` | catalog |
| GET | `/api/cluster-sets` | catalog |
| GET | `/api/cluster-labels` | catalog |
| GET | `/api/placement-targets?namespace=` | bindings + clusters |
| GET | `/api/console-url` | `consoles.config.openshift.io/cluster` |
| GET | `/api/policies/:ns/:name` | existence / get |
| GET | `/api/policies/:ns/:name/bundle` | Policy + Placement + PlacementBinding |

Kube config: in-cluster if `KUBERNETES_SERVICE_HOST`, else `KUBECONFIG` / default. Set `DISABLE_CLUSTER_CATALOG=true` for e2e/local without a hub.

## Deploy (`deploy/`)

| File | Purpose |
|------|---------|
| `install.sh` | Namespace → proxy secret → `oc apply -k` → set image → rollout → ConsoleLink |
| `kustomization.yaml` | Assembles manifests; image rewrite |
| `deployment.yaml` | Sidecar: oauth-proxy + app |
| `rbac.yaml` | ClusterRole for policies/placements/clusters/consoles |
| `route.yaml` | Reencrypt Route |
| `consolelink.yaml` | Tools menu; `HREF_PLACEHOLDER` replaced at install |

Default image: `quay.io/rh-ee-ybeder/acm-policy-helper:latest` (`imagePullPolicy: Always`). Pin with `IMAGE=...:1.9.0 ./deploy/install.sh`.

## Scripts & tests

| Path | Purpose |
|------|---------|
| `scripts/build-push.sh` | podman build/push `:version` + `:latest`; `--deploy` runs install |
| `scripts/download-policy-generator.sh` | PG binary → `e2e/bin` |
| `scripts/take-screenshots.mjs` | Regenerates `docs/screenshots/*.png` |
| `e2e/tests/*.spec.ts` | Playwright coverage of wizard paths |
| `backend/tests/template-deploy.cluster.test.ts` | Live hub apply of all templates (`RUN_CLUSTER_TESTS=1`) |

CI: backend unit → frontend unit → e2e. Images are **not** built in GitHub Actions.

## Env vars (cheat sheet)

| Variable | Use |
|----------|-----|
| `PORT` | Backend listen (default `8080`) |
| `PUBLIC_DIR` | Static SPA root |
| `POLICY_GENERATOR_BIN` | Path to PolicyGenerator |
| `POLICY_GENERATOR_VERSION` | Download/CI tag (default `v1.19.0`) |
| `DISABLE_CLUSTER_CATALOG` | Skip kube catalog APIs |
| `KUBECONFIG` / `KUBERNETES_SERVICE_HOST` | Local vs in-cluster |
| `IMAGE` / `IMAGE_REPO` / `NAMESPACE` | Install / build-push |
| `E2E_PORT` | Playwright webServer port |
| `RUN_CLUSTER_TESTS` | Enable live hub template test |

## Where to change what

| Goal | Start here |
|------|------------|
| Wizard UX / steps | `frontend/src/components/PolicyWizard/` |
| Form / API types | `frontend/src/types.ts`, `backend/src/types.ts`, `API.md` |
| Generation / PG flags | `backend/src/services/policyGenerator.ts` |
| Apply / catalogs / console URL | `backend/src/services/kubeClient.ts` |
| Built-in templates | `frontend/src/templates/` |
| OpenShift auth / install | `deploy/deployment.yaml`, `rbac.yaml`, `install.sh` |
| Docs screenshots | `scripts/take-screenshots.mjs` |
| Release | Bump version in 4× `package.json` → `npm run image:release` |
