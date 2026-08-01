import * as k8s from '@kubernetes/client-node';
import { loadAll } from 'js-yaml';
import type { ApplyResult } from '../types.js';

interface KubeObject {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function parseApiVersion(apiVersion: string): { group: string; version: string } {
  if (!apiVersion.includes('/')) {
    return { group: '', version: apiVersion };
  }
  const [group, version] = apiVersion.split('/');
  return { group, version };
}

function pluralizeKind(kind: string): string {
  const irregular: Record<string, string> = {
    Policy: 'policies',
    Placement: 'placements',
    PlacementBinding: 'placementbindings',
    ManagedClusterSetBinding: 'managedclustersetbindings',
    ConfigurationPolicy: 'configurationpolicies',
  };
  if (irregular[kind]) {
    return irregular[kind];
  }
  const lower = kind.toLowerCase();
  if (lower.endsWith('y')) {
    return `${lower.slice(0, -1)}ies`;
  }
  if (lower.endsWith('s')) {
    return lower;
  }
  return `${lower}s`;
}

function isClusterCatalogDisabled(): boolean {
  const flag = process.env.DISABLE_CLUSTER_CATALOG;
  return flag === '1' || flag === 'true';
}

function getKubeConfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  // In-cluster service account (OpenShift / Kubernetes pods)
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
    return kc;
  }
  // Explicit kubeconfig path for local development
  if (process.env.KUBECONFIG) {
    kc.loadFromFile(process.env.KUBECONFIG);
    return kc;
  }
  kc.loadFromDefault();
  return kc;
}

function getHttpStatus(err: unknown): number | undefined {
  const e = err as { code?: number; statusCode?: number; response?: { statusCode?: number } };
  return e.code ?? e.statusCode ?? e.response?.statusCode;
}

async function applyObject(
  customApi: k8s.CustomObjectsApi,
  obj: KubeObject
): Promise<ApplyResult> {
  const name = obj.metadata?.name;
  const namespace = obj.metadata?.namespace;
  const kind = obj.kind;
  const { group, version } = parseApiVersion(obj.apiVersion);
  const plural = pluralizeKind(kind);

  if (!name || !kind || !obj.apiVersion) {
    return {
      kind: kind || 'Unknown',
      name: name || 'unknown',
      namespace,
      status: 'error',
      message: 'Missing apiVersion, kind, or metadata.name',
    };
  }

    try {
    if (namespace) {
      try {
        const existing = (await customApi.getNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
          name,
        })) as KubeObject;
        const merged = {
          ...obj,
          metadata: { ...obj.metadata, resourceVersion: existing.metadata?.resourceVersion },
        };
        await customApi.replaceNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
          name,
          body: merged,
        });
        return { kind, name, namespace, status: 'updated' };
      } catch (err: unknown) {
        if (getHttpStatus(err) === 404) {
          await customApi.createNamespacedCustomObject({
            group,
            version,
            namespace,
            plural,
            body: obj,
          });
          return { kind, name, namespace, status: 'created' };
        }
        throw err;
      }
    }

    try {
      const existing = (await customApi.getClusterCustomObject({
        group,
        version,
        plural,
        name,
      })) as KubeObject;
      const merged = {
        ...obj,
        metadata: { ...obj.metadata, resourceVersion: existing.metadata?.resourceVersion },
      };
      await customApi.replaceClusterCustomObject({
        group,
        version,
        plural,
        name,
        body: merged,
      });
      return { kind, name, status: 'updated' };
    } catch (err: unknown) {
      if (getHttpStatus(err) === 404) {
        await customApi.createClusterCustomObject({
          group,
          version,
          plural,
          body: obj,
        });
        return { kind, name, status: 'created' };
      }
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind, name, namespace, status: 'error', message };
  }
}

export async function listNamespaces(): Promise<string[]> {
  if (isClusterCatalogDisabled()) {
    return [];
  }
  const kc = getKubeConfig();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const response = await coreApi.listNamespace({});
  const items = response.items ?? [];
  return items
    .map((ns) => ns.metadata?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));
}

interface NamedCustomObject {
  metadata?: { name?: string; labels?: Record<string, string> };
}

export async function listManagedClusterSets(): Promise<string[]> {
  if (isClusterCatalogDisabled()) {
    return [];
  }
  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  const response = (await customApi.listClusterCustomObject({
    group: 'cluster.open-cluster-management.io',
    version: 'v1beta2',
    plural: 'managedclustersets',
  })) as { items?: NamedCustomObject[] };

  return (response.items ?? [])
    .map((item) => item.metadata?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));
}

export interface ClusterLabelCatalog {
  keys: string[];
  valuesByKey: Record<string, string[]>;
}

export interface PlacementTargets {
  namespace: string;
  clusterSets: string[];
  clusters: string[];
}

const CLUSTERSET_LABEL = 'cluster.open-cluster-management.io/clusterset';

/**
 * Resolve ManagedClusterSetBindings in a namespace and the ManagedClusters
 * those sets currently include (for empty Placement labelSelector awareness).
 */
export async function listPlacementTargets(namespace: string): Promise<PlacementTargets> {
  const ns = namespace.trim();
  if (isClusterCatalogDisabled() || !ns) {
    return { namespace: ns, clusterSets: [], clusters: [] };
  }

  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);

  const [bindingsResponse, clustersResponse] = await Promise.all([
    customApi.listNamespacedCustomObject({
      group: 'cluster.open-cluster-management.io',
      version: 'v1beta2',
      namespace: ns,
      plural: 'managedclustersetbindings',
    }) as Promise<{
      items?: Array<{ spec?: { clusterSet?: string }; metadata?: { name?: string } }>;
    }>,
    customApi.listClusterCustomObject({
      group: 'cluster.open-cluster-management.io',
      version: 'v1',
      plural: 'managedclusters',
    }) as Promise<{ items?: NamedCustomObject[] }>,
  ]);

  const clusterSets = Array.from(
    new Set(
      (bindingsResponse.items ?? [])
        .map((item) => item.spec?.clusterSet || item.metadata?.name)
        .filter((name): name is string => Boolean(name))
    )
  ).sort((a, b) => a.localeCompare(b));

  const allClusters = (clustersResponse.items ?? [])
    .map((item) => ({
      name: item.metadata?.name,
      clusterSet: item.metadata?.labels?.[CLUSTERSET_LABEL],
    }))
    .filter((c): c is { name: string; clusterSet: string | undefined } => Boolean(c.name));

  let clusters: string[];
  if (clusterSets.length === 0) {
    clusters = [];
  } else if (clusterSets.includes('global')) {
    clusters = allClusters.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  } else {
    const setNames = new Set(clusterSets);
    clusters = allClusters
      .filter((c) => c.clusterSet && setNames.has(c.clusterSet))
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b));
  }

  return { namespace: ns, clusterSets, clusters };
}

export async function listManagedClusterLabels(): Promise<ClusterLabelCatalog> {
  if (isClusterCatalogDisabled()) {
    return { keys: [], valuesByKey: {} };
  }
  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  const response = (await customApi.listClusterCustomObject({
    group: 'cluster.open-cluster-management.io',
    version: 'v1',
    plural: 'managedclusters',
  })) as { items?: NamedCustomObject[] };

  const valuesByKey: Record<string, Set<string>> = {};
  for (const item of response.items ?? []) {
    const labels = item.metadata?.labels || {};
    for (const [key, value] of Object.entries(labels)) {
      if (!valuesByKey[key]) {
        valuesByKey[key] = new Set();
      }
      if (value !== undefined && value !== null && String(value).length) {
        valuesByKey[key].add(String(value));
      }
    }
  }

  const keys = Object.keys(valuesByKey).sort((a, b) => a.localeCompare(b));
  return {
    keys,
    valuesByKey: Object.fromEntries(
      keys.map((key) => [key, Array.from(valuesByKey[key]).sort((a, b) => a.localeCompare(b))])
    ),
  };
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

async function getNamespacedObject(
  customApi: k8s.CustomObjectsApi,
  group: string,
  version: string,
  plural: string,
  namespace: string,
  name: string
): Promise<Record<string, unknown> | null> {
  try {
    return (await customApi.getNamespacedCustomObject({
      group,
      version,
      namespace,
      plural,
      name,
    })) as Record<string, unknown>;
  } catch (err: unknown) {
    if (getHttpStatus(err) === 404) {
      return null;
    }
    throw err;
  }
}

export async function getPolicy(
  namespace: string,
  name: string
): Promise<Record<string, unknown>> {
  if (isClusterCatalogDisabled()) {
    throw new NotFoundError(`Policy "${name}" not found in namespace "${namespace}"`);
  }
  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  const policy = await getNamespacedObject(
    customApi,
    'policy.open-cluster-management.io',
    'v1',
    'policies',
    namespace,
    name
  );
  if (!policy) {
    throw new NotFoundError(`Policy "${name}" not found in namespace "${namespace}"`);
  }
  return policy;
}

export interface PolicyBundle {
  policy: Record<string, unknown>;
  placement?: Record<string, unknown>;
  placementBinding?: Record<string, unknown>;
}

export async function getPolicyBundle(
  namespace: string,
  name: string
): Promise<PolicyBundle> {
  if (isClusterCatalogDisabled()) {
    throw new NotFoundError(`Policy "${name}" not found in namespace "${namespace}"`);
  }
  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);

  const policy = await getNamespacedObject(
    customApi,
    'policy.open-cluster-management.io',
    'v1',
    'policies',
    namespace,
    name
  );
  if (!policy) {
    throw new NotFoundError(`Policy "${name}" not found in namespace "${namespace}"`);
  }

  const [placement, placementBinding] = await Promise.all([
    getNamespacedObject(
      customApi,
      'cluster.open-cluster-management.io',
      'v1beta1',
      'placements',
      namespace,
      `placement-${name}`
    ),
    getNamespacedObject(
      customApi,
      'policy.open-cluster-management.io',
      'v1',
      'placementbindings',
      namespace,
      `binding-${name}`
    ),
  ]);

  return {
    policy,
    ...(placement ? { placement } : {}),
    ...(placementBinding ? { placementBinding } : {}),
  };
}

export async function getConsoleUrl(): Promise<string | null> {
  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  try {
    const console = (await customApi.getClusterCustomObject({
      group: 'config.openshift.io',
      version: 'v1',
      plural: 'consoles',
      name: 'cluster',
    })) as { status?: { consoleURL?: string } };
    return console.status?.consoleURL ?? null;
  } catch {
    return null;
  }
}

export async function applyYaml(yamlContent: string): Promise<ApplyResult[]> {
  const docs = (loadAll(yamlContent) as (KubeObject | null)[]).filter(
    (d): d is KubeObject => Boolean(d && typeof d === 'object' && d.kind)
  );

  if (!docs.length) {
    throw new Error('No Kubernetes resources found in YAML');
  }

  const kc = getKubeConfig();
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
  const results: ApplyResult[] = [];

  for (const doc of docs) {
    results.push(await applyObject(customApi, doc));
  }

  return results;
}
