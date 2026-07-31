# HTTP API

Backend JSON API used by the UI. On OpenShift, routes go through oauth-proxy except `/api/health`.

Base URL (local): `http://localhost:8080`

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check / probes |
| `POST` | `/api/generate` | Form JSON → generated policy YAML |
| `POST` | `/api/apply` | Apply multi-doc YAML to the hub |
| `GET` | `/api/namespaces` | List hub namespaces |
| `GET` | `/api/cluster-sets` | List ManagedClusterSets |
| `GET` | `/api/cluster-labels` | List ManagedCluster label keys/values |
| `GET` | `/api/placement-targets?namespace=` | Bound ManagedClusterSets + clusters for a namespace |
| `GET` | `/api/policies/:namespace/:name` | Get a Policy |
| `GET` | `/api/policies/:namespace/:name/bundle` | Get Policy + Placement + PlacementBinding |

### `GET /api/health`

Unauthenticated (oauth-proxy skip).

```json
{ "status": "ok", "user": "<x-forwarded-user or null>" }
```

### `POST /api/generate`

Request body (`GenerateRequest`):

```json
{
  "policyName": "string",
  "namespace": "string",
  "remediationAction": "inform | enforce",
  "severity": "low | medium | high | critical",
  "complianceType": "musthave | mustonlyhave | mustnothave",
  "description": "optional",
  "disabled": false,
  "pruneObjectBehavior": "None | DeleteAll | DeleteIfCreated",
  "standards": ["NIST SP 800-53"],
  "categories": ["CM Configuration Management"],
  "controls": ["CM-2 Baseline Configuration"],
  "consolidateManifests": true,
  "placement": {
    "mode": "labelSelector | clusterSets",
    "labelSelector": {
      "matchLabels": { "key": "value" },
      "matchExpressions": [
        { "key": "string", "operator": "In | NotIn | Exists | DoesNotExist", "values": ["a"] }
      ]
    },
    "clusterSets": ["default"],
    "matchExpressions": []
  },
  "manifests": [
    {
      "name": "example.yaml",
      "content": "apiVersion: v1\nkind: ConfigMap\n...",
      "configPolicyName": "optional-when-not-consolidated",
      "complianceType": "optional-per-manifest-override"
    }
  ]
}
```

Success: `{ "yaml": "<multi-doc YAML>" }`  
Error: `400` `{ "error": "..." }`

When `consolidateManifests` is `false`, one ConfigurationPolicy is generated per manifest. `clusterSets` mode also emits `ManagedClusterSetBinding` resources.

### `POST /api/apply`

```json
{ "yaml": "<multi-doc Kubernetes YAML>" }
```

Applies each document with the process kubeconfig / in-cluster ServiceAccount.

Success: `200` `{ "results": [ { "kind", "name", "namespace?", "status": "created | updated | error", "message?" } ] }`  
Partial failure: `207` with the same shape  
Bad request: `400` `{ "error": "..." }`

### `GET /api/namespaces`

```json
{ "namespaces": ["policies", "..."] }
```

On catalog/kube errors may return `500` with an empty list (see route behavior).

### `GET /api/cluster-sets`

```json
{ "clusterSets": ["default", "..."] }
```

### `GET /api/cluster-labels`

```json
{
  "labels": {
    "vendor": ["OpenShift"],
    "name": ["local-cluster"]
  }
}
```

### `GET /api/placement-targets?namespace=<ns>`

Lists `ManagedClusterSetBinding`s in the policy namespace and the ManagedClusters currently in those sets (for empty Placement label-selector awareness).

```json
{
  "namespace": "acm-policy",
  "clusterSets": ["default", "managed"],
  "clusters": ["local-cluster"]
}
```

`400` if `namespace` is missing. On kube errors may return `500` with empty `clusterSets` / `clusters`.

### `GET /api/policies/:namespace/:name`

```json
{ "policy": { "...": "Policy object" } }
```

`404` if missing.

### `GET /api/policies/:namespace/:name/bundle`

```json
{
  "policy": { },
  "placement": { },
  "placementBinding": { }
}
```

`placement` / `placementBinding` are omitted when not found. Looks up `placement-<name>` and `binding-<name>` by convention.
