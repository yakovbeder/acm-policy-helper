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

/** PF6 Label colors for category chips (list + detail). */
export const CATEGORY_LABEL_COLORS: Record<TemplateCategory, 'blue' | 'green'> = {
  'cluster-config': 'blue',
  'cluster-health': 'green',
};

export const CATEGORY_ORDER: TemplateCategory[] = ['cluster-config', 'cluster-health'];
