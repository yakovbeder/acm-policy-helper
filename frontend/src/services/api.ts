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
    placement: form.placement,
    manifests: form.manifests.map(({ name, content }) => ({ name, content })),
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
