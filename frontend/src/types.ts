export interface MatchExpression {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface LabelSelector {
  matchLabels: Record<string, string>;
  matchExpressions: MatchExpression[];
}

export interface PlacementConfig {
  mode: 'labelSelector' | 'clusterSets';
  labelSelector: LabelSelector;
  clusterSets: string[];
  matchExpressions: MatchExpression[];
}

export interface ManifestInput {
  id: string;
  name: string;
  content: string;
  lintErrors?: string[];
}

export interface PolicyFormState {
  policyName: string;
  namespace: string;
  remediationAction: 'inform' | 'enforce';
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceType: 'musthave' | 'mustonlyhave' | 'mustnothave';
  description: string;
  disabled: boolean;
  pruneObjectBehavior: 'None' | 'DeleteAll' | 'DeleteIfCreated';
  standards: string[];
  categories: string[];
  controls: string[];
  placement: PlacementConfig;
  manifests: ManifestInput[];
}

export interface ApplyResult {
  kind: string;
  name: string;
  namespace?: string;
  status: 'created' | 'updated' | 'error';
  message?: string;
}

export const defaultFormState = (): PolicyFormState => ({
  policyName: '',
  namespace: 'policies',
  remediationAction: 'inform',
  severity: 'low',
  complianceType: 'musthave',
  description: '',
  disabled: false,
  pruneObjectBehavior: 'None',
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
  placement: {
    mode: 'labelSelector',
    labelSelector: {
      matchLabels: {},
      matchExpressions: [],
    },
    clusterSets: [],
    matchExpressions: [],
  },
  manifests: [],
});
