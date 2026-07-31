import type { PolicyFormState } from '../types';

export type TemplateCategory = 'cluster-config' | 'cluster-health';

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
  'cluster-config': 'Cluster config',
  'cluster-health': 'Cluster health',
};

export const CATEGORY_ORDER: TemplateCategory[] = ['cluster-config', 'cluster-health'];
