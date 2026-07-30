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

export type ComplianceType = 'musthave' | 'mustonlyhave' | 'mustnothave';

export interface ManifestInput {
  name: string;
  content: string;
  /** ConfigurationPolicy name when consolidateManifests is false */
  configPolicyName?: string;
  /** Per-manifest compliance override */
  complianceType?: ComplianceType;
}

export interface GenerateRequest {
  policyName: string;
  namespace: string;
  remediationAction: 'inform' | 'enforce';
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceType: ComplianceType;
  description?: string;
  disabled?: boolean;
  pruneObjectBehavior?: 'None' | 'DeleteAll' | 'DeleteIfCreated';
  standards?: string[];
  categories?: string[];
  controls?: string[];
  /** When false, one ConfigurationPolicy is generated per manifest */
  consolidateManifests?: boolean;
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
