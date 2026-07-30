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
