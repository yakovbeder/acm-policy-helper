import type { ApplyResult, PolicyFormState } from '../types';

export async function generatePolicy(form: PolicyFormState): Promise<string> {
  const payload = {
    policyName: form.policyName,
    namespace: form.namespace,
    remediationAction: form.remediationAction,
    severity: form.severity,
    complianceType: form.complianceType,
    description: form.description,
    disabled: form.disabled,
    pruneObjectBehavior: form.pruneObjectBehavior,
    standards: form.standards,
    categories: form.categories,
    controls: form.controls,
    consolidateManifests: form.consolidateManifests,
    placement: form.placement,
    manifests: form.manifests.map(({ name, content, configPolicyName, complianceType }) => ({
      name,
      content,
      configPolicyName,
      complianceType,
    })),
  };

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate policy');
  }
  return data.yaml as string;
}

export async function applyPolicy(yamlContent: string): Promise<ApplyResult[]> {
  const res = await fetch('/api/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml: yamlContent }),
  });

  const data = await res.json();
  if (!res.ok && !data.results) {
    throw new Error(data.error || 'Failed to apply policy');
  }
  return data.results as ApplyResult[];
}

export async function fetchNamespaces(): Promise<string[]> {
  const res = await fetch('/api/namespaces');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to list namespaces');
  }
  return (data.namespaces as string[]) || [];
}

export async function fetchClusterSets(): Promise<string[]> {
  const res = await fetch('/api/cluster-sets');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to list ManagedClusterSets');
  }
  return (data.clusterSets as string[]) || [];
}

export interface ClusterLabelCatalog {
  keys: string[];
  valuesByKey: Record<string, string[]>;
}

export async function fetchClusterLabels(): Promise<ClusterLabelCatalog> {
  const res = await fetch('/api/cluster-labels');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to list managed cluster labels');
  }
  return {
    keys: (data.keys as string[]) || [],
    valuesByKey: (data.valuesByKey as Record<string, string[]>) || {},
  };
}

export async function fetchPolicy(
  namespace: string,
  name: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/policies/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`);
  if (res.status === 404) {
    return null;
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to get policy');
  }
  return (data.policy as Record<string, unknown>) || null;
}

export interface PolicyBundleResponse {
  policy: Record<string, unknown>;
  placement?: Record<string, unknown>;
  placementBinding?: Record<string, unknown>;
}

export async function fetchPolicyBundle(
  namespace: string,
  name: string
): Promise<PolicyBundleResponse> {
  const res = await fetch(
    `/api/policies/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/bundle`
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to get policy bundle');
  }
  return data as PolicyBundleResponse;
}
