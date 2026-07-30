import { dump } from 'js-yaml';
import {
  defaultFormState,
  type ComplianceType,
  type ManifestInput,
  type MatchExpression,
  type PlacementConfig,
  type PolicyFormState,
} from '../types';

export interface PolicyBundle {
  policy: Record<string, unknown>;
  placement?: Record<string, unknown>;
  placementBinding?: Record<string, unknown>;
}

export interface HydrateResult {
  form: PolicyFormState;
  warnings: string[];
  sourcePolicyResourceVersion?: string;
}

function annotationList(annotations: Record<string, string> | undefined, key: string): string[] {
  const raw = annotations?.[key];
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dumpObject(obj: unknown): string {
  return dump(obj, { lineWidth: -1, noRefs: true, sortKeys: false }).trimEnd() + '\n';
}

function hydratePlacement(placement: Record<string, unknown> | undefined): PlacementConfig {
  const empty: PlacementConfig = {
    mode: 'labelSelector',
    labelSelector: { matchLabels: {}, matchExpressions: [] },
    clusterSets: [],
    matchExpressions: [],
  };
  if (!placement) {
    return empty;
  }

  const spec = (placement.spec || {}) as Record<string, unknown>;
  const clusterSets = Array.isArray(spec.clusterSets)
    ? (spec.clusterSets as string[]).filter(Boolean)
    : [];

  const predicates =
    (spec.predicates as {
      requiredClusterSelector?: {
        labelSelector?: {
          matchLabels?: Record<string, string>;
          matchExpressions?: MatchExpression[];
        };
      };
    }[]) || [];

  const labelSelector = predicates[0]?.requiredClusterSelector?.labelSelector || {};
  const matchLabels = labelSelector.matchLabels || {};
  const matchExpressions = labelSelector.matchExpressions || [];

  if (clusterSets.length) {
    return {
      mode: 'clusterSets',
      labelSelector: { matchLabels: {}, matchExpressions: [] },
      clusterSets,
      matchExpressions,
    };
  }

  return {
    mode: 'labelSelector',
    labelSelector: {
      matchLabels: { ...matchLabels },
      matchExpressions: [...matchExpressions],
    },
    clusterSets: [],
    matchExpressions: [],
  };
}

function manifestsFromConfigurationPolicy(
  cp: Record<string, unknown>,
  options: { splitObjectTemplates: boolean; defaultCompliance: ComplianceType }
): {
  manifests: ManifestInput[];
  complianceType: ComplianceType;
  severity?: PolicyFormState['severity'];
  prune?: PolicyFormState['pruneObjectBehavior'];
} {
  const metadata = (cp.metadata || {}) as { name?: string };
  const spec = (cp.spec || {}) as Record<string, unknown>;
  const configPolicyName = metadata.name || 'config-policy';
  const complianceType =
    (spec.complianceType as ComplianceType | undefined) || options.defaultCompliance;

  const severity =
    typeof spec.severity === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(spec.severity)
      ? (spec.severity as PolicyFormState['severity'])
      : undefined;
  const prune =
    typeof spec.pruneObjectBehavior === 'string' &&
    ['None', 'DeleteAll', 'DeleteIfCreated'].includes(spec.pruneObjectBehavior)
      ? (spec.pruneObjectBehavior as PolicyFormState['pruneObjectBehavior'])
      : undefined;

  if (typeof spec['object-templates-raw'] === 'string') {
    return {
      manifests: [
        {
          id: newId(),
          name: `${configPolicyName}.yaml`,
          content: dumpObject({ 'object-templates-raw': spec['object-templates-raw'] }),
          configPolicyName,
          complianceType,
        },
      ],
      complianceType,
      severity,
      prune,
    };
  }

  const templates =
    (spec['object-templates'] as {
      complianceType?: string;
      objectDefinition?: unknown;
    }[]) || [];

  if (!templates.length) {
    return { manifests: [], complianceType, severity, prune };
  }

  if (!options.splitObjectTemplates || templates.length === 1) {
    const content =
      templates.length === 1
        ? dumpObject(templates[0].objectDefinition)
        : templates.map((t) => dumpObject(t.objectDefinition)).join('---\n');
    return {
      manifests: [
        {
          id: newId(),
          name: `${configPolicyName}.yaml`,
          content,
          configPolicyName,
          complianceType:
            (templates[0]?.complianceType as ComplianceType | undefined) || complianceType,
        },
      ],
      complianceType,
      severity,
      prune,
    };
  }

  // Single consolidated CP: one ManifestInput per object-template
  return {
    manifests: templates.map((t, index) => {
      const obj = t.objectDefinition as
        | { kind?: string; metadata?: { name?: string } }
        | undefined;
      const kind = obj?.kind?.toLowerCase() || 'manifest';
      const objName = obj?.metadata?.name || `${index + 1}`;
      return {
        id: newId(),
        name: `${kind}-${objName}.yaml`,
        content: dumpObject(t.objectDefinition),
        configPolicyName,
        complianceType: (t.complianceType as ComplianceType | undefined) || complianceType,
      };
    }),
    complianceType,
    severity,
    prune,
  };
}

/**
 * Map a live Policy (+ optional Placement) into wizard form state for edit mode.
 */
export function hydrateFormFromPolicyBundle(bundle: PolicyBundle): HydrateResult {
  const warnings: string[] = [];
  const policy = bundle.policy;
  const metadata = (policy.metadata || {}) as {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
    resourceVersion?: string;
  };
  const spec = (policy.spec || {}) as Record<string, unknown>;
  const annotations = metadata.annotations || {};

  const templates =
    (spec['policy-templates'] as { objectDefinition?: Record<string, unknown> }[]) || [];
  const configPolicies: Record<string, unknown>[] = [];

  for (const template of templates) {
    const od = template.objectDefinition;
    if (!od) {
      continue;
    }
    if (od.kind !== 'ConfigurationPolicy') {
      warnings.push(
        `Skipped unsupported policy-template kind "${String(od.kind)}". Only ConfigurationPolicy templates can be edited here.`
      );
      continue;
    }
    configPolicies.push(od);
  }

  if (!configPolicies.length) {
    warnings.push('No ConfigurationPolicy templates found in this Policy.');
  }

  const base = defaultFormState();
  const consolidateManifests = configPolicies.length <= 1;
  const manifests: ManifestInput[] = [];
  let severity = base.severity;
  let prune = base.pruneObjectBehavior;
  let complianceType = base.complianceType;

  for (const cp of configPolicies) {
    const extracted = manifestsFromConfigurationPolicy(cp, {
      splitObjectTemplates: consolidateManifests,
      defaultCompliance: base.complianceType,
    });
    manifests.push(...extracted.manifests);
    if (extracted.severity) {
      severity = extracted.severity;
    }
    if (extracted.prune) {
      prune = extracted.prune;
    }
    complianceType = extracted.complianceType;
  }

  const remediationAction =
    spec.remediationAction === 'enforce' || spec.remediationAction === 'inform'
      ? spec.remediationAction
      : base.remediationAction;

  const standards = annotationList(annotations, 'policy.open-cluster-management.io/standards');
  const categories = annotationList(annotations, 'policy.open-cluster-management.io/categories');
  const controls = annotationList(annotations, 'policy.open-cluster-management.io/controls');

  const form: PolicyFormState = {
    ...base,
    policyName: metadata.name || '',
    namespace: metadata.namespace || 'policies',
    remediationAction,
    severity,
    complianceType,
    description: annotations['policy.open-cluster-management.io/description'] || '',
    disabled: Boolean(spec.disabled),
    pruneObjectBehavior: prune,
    standards: standards.length ? standards : base.standards,
    categories: categories.length ? categories : base.categories,
    controls: controls.length ? controls : base.controls,
    consolidateManifests,
    placement: hydratePlacement(bundle.placement),
    manifests,
  };

  return {
    form,
    warnings,
    sourcePolicyResourceVersion: metadata.resourceVersion,
  };
}
