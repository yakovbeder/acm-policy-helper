import * as k8s from '@kubernetes/client-node';
import yaml from 'js-yaml';
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

function getKubeConfig(): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();
  if (process.env.KUBECONFIG || process.env.KUBERNETES_SERVICE_HOST) {
    try {
      kc.loadFromCluster();
      return kc;
    } catch {
      // fall through to default
    }
  }
  kc.loadFromDefault();
  return kc;
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
        await customApi.getNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
          name,
        });
        await customApi.replaceNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
          name,
          body: obj,
        });
        return { kind, name, namespace, status: 'updated' };
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number; response?: { statusCode?: number } })
          ?.statusCode ||
          (err as { response?: { statusCode?: number } })?.response?.statusCode;
        if (statusCode === 404) {
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
      await customApi.getClusterCustomObject({ group, version, plural, name });
      await customApi.replaceClusterCustomObject({
        group,
        version,
        plural,
        name,
        body: obj,
      });
      return { kind, name, status: 'updated' };
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number; response?: { statusCode?: number } })
        ?.statusCode ||
        (err as { response?: { statusCode?: number } })?.response?.statusCode;
      if (statusCode === 404) {
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

export async function listManagedClusterLabels(): Promise<ClusterLabelCatalog> {
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

export async function applyYaml(yamlContent: string): Promise<ApplyResult[]> {
  const docs = (yaml.loadAll(yamlContent) as (KubeObject | null)[]).filter(
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
