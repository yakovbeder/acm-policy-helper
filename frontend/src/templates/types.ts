import type { PolicyFormState } from '../types';

export type TemplateCategory = 'operators' | 'cluster-config';

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  manifests: Array<{ name: string; content: string }>;
  defaults: Partial<PolicyFormState>;
  notes?: string[];
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  operators: 'Operators',
  'cluster-config': 'Cluster config',
};

export const CATEGORY_ORDER: TemplateCategory[] = ['operators', 'cluster-config'];
