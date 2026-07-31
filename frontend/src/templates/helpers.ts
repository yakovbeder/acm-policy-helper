import type { ManifestInput, PolicyFormState } from '../types';
import { defaultFormState } from '../types';
import type { PolicyTemplate } from './types';

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function manifestsFromTemplate(
  template: PolicyTemplate,
  complianceType: PolicyFormState['complianceType']
): ManifestInput[] {
  return template.manifests.map((m, index) => ({
    id: newId() + `-${index}`,
    name: m.name.endsWith('.yaml') || m.name.endsWith('.yml') ? m.name : `${m.name}.yaml`,
    content: m.content.trim() + '\n',
    configPolicyName: m.name.replace(/\.(ya?ml)$/i, ''),
    complianceType,
  }));
}

/** Apply a template into a fresh form (keeps namespace default unless template overrides). */
export function formFromTemplate(template: PolicyTemplate): PolicyFormState {
  const base = defaultFormState();
  const defaults = template.defaults;
  const complianceType = defaults.complianceType ?? base.complianceType;
  return {
    ...base,
    ...defaults,
    placement: defaults.placement ?? base.placement,
    manifests: manifestsFromTemplate(template, complianceType),
  };
}
