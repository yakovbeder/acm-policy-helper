import { clusterConfigTemplates } from './cluster-config';
import { clusterHealthTemplates } from './cluster-health';
import type { PolicyTemplate, TemplateCategory } from './types';

export type { PolicyTemplate, TemplateCategory } from './types';
export { CATEGORY_LABELS, CATEGORY_ORDER } from './types';
export { formFromTemplate, manifestsFromTemplate } from './helpers';

export const policyTemplates: PolicyTemplate[] = [
  ...clusterConfigTemplates,
  ...clusterHealthTemplates,
];

export function getTemplateById(id: string): PolicyTemplate | undefined {
  return policyTemplates.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory | 'all'): PolicyTemplate[] {
  if (category === 'all') {
    return policyTemplates;
  }
  return policyTemplates.filter((t) => t.category === category);
}
