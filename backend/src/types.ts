export interface MatchExpression {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: MatchExpression[];
}

export interface PlacementConfig {
  mode: 'labelSelector' | 'clusterSets';
  labelSelector?: LabelSelector;
  clusterSets?: string[];
  matchExpressions?: MatchExpression[];
}

export interface ManifestInput {
  name: string;
  content: string;
}

export interface GenerateRequest {
  policyName: string;
  namespace: string;
  remediationAction: 'inform' | 'enforce';
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceType: 'musthave' | 'mustonlyhave' | 'mustnothave';
  description?: string;
  disabled?: boolean;
  pruneObjectBehavior?: 'None' | 'DeleteAll' | 'DeleteIfCreated';
  standards?: string[];
  categories?: string[];
  controls?: string[];
  placement: PlacementConfig;
  manifests: ManifestInput[];
}

export interface ApplyRequest {
  yaml: string;
}

export interface ApplyResult {
  kind: string;
  name: string;
  namespace?: string;
  status: 'created' | 'updated' | 'error';
  message?: string;
}
