import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import {
  buildPolicyGeneratorDocument,
  injectClusterSets,
  sanitizeFileName,
} from './policyGenerator.js';
import type { GenerateRequest } from '../types.js';

const baseRequest = (): GenerateRequest => ({
  policyName: 'sample-policy',
  namespace: 'policies',
  remediationAction: 'inform',
  severity: 'low',
  complianceType: 'musthave',
  disabled: false,
  pruneObjectBehavior: 'None',
  standards: ['NIST SP 800-53'],
  categories: ['CM Configuration Management'],
  controls: ['CM-2 Baseline Configuration'],
  placement: {
    mode: 'labelSelector',
    labelSelector: {
      matchLabels: { environment: 'prod' },
      matchExpressions: [],
    },
    clusterSets: [],
    matchExpressions: [],
  },
  manifests: [{ name: 'cm.yaml', content: 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: demo\n' }],
});

describe('sanitizeFileName', () => {
  it('keeps valid yaml names', () => {
    expect(sanitizeFileName('config.yaml', 0)).toBe('config.yaml');
  });

  it('adds yaml extension when missing', () => {
    expect(sanitizeFileName('config', 1)).toBe('config.yaml');
  });

  it('sanitizes unsafe characters', () => {
    expect(sanitizeFileName('../evil name!.yml', 2)).toBe('_evil_name_.yml');
  });
});

describe('buildPolicyGeneratorDocument', () => {
  it('builds a PolicyGenerator CR with label selectors', () => {
    const doc = buildPolicyGeneratorDocument(baseRequest(), 'manifests') as Record<
      string,
      unknown
    >;
    expect(doc.apiVersion).toBe('policy.open-cluster-management.io/v1');
    expect(doc.kind).toBe('PolicyGenerator');
    const defaults = doc.policyDefaults as Record<string, unknown>;
    expect(defaults.namespace).toBe('policies');
    expect(defaults.remediationAction).toBe('inform');
    const placement = defaults.placement as Record<string, unknown>;
    expect(placement.name).toBe('placement-sample-policy');
    expect(placement.labelSelector).toEqual({ matchLabels: { environment: 'prod' } });
  });

  it('includes matchExpressions for clusterSets mode', () => {
    const req = baseRequest();
    req.placement = {
      mode: 'clusterSets',
      clusterSets: ['default'],
      labelSelector: { matchLabels: {}, matchExpressions: [] },
      matchExpressions: [{ key: 'vendor', operator: 'In', values: ['OpenShift'] }],
    };
    const doc = buildPolicyGeneratorDocument(req, 'manifests') as Record<string, unknown>;
    const defaults = doc.policyDefaults as Record<string, unknown>;
    const placement = defaults.placement as Record<string, unknown>;
    expect(placement.labelSelector).toEqual({
      matchExpressions: [{ key: 'vendor', operator: 'In', values: ['OpenShift'] }],
    });
  });
});

describe('injectClusterSets', () => {
  it('returns original yaml when not using clusterSets', () => {
    const input = 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: x\n';
    expect(injectClusterSets(input, baseRequest())).toBe(input);
  });

  it('adds ManagedClusterSetBinding and clusterSets on Placement', () => {
    const generated = [
      {
        apiVersion: 'policy.open-cluster-management.io/v1',
        kind: 'Policy',
        metadata: { name: 'sample-policy', namespace: 'policies' },
      },
      {
        apiVersion: 'cluster.open-cluster-management.io/v1beta1',
        kind: 'Placement',
        metadata: { name: 'placement-sample-policy', namespace: 'policies' },
        spec: { predicates: [] },
      },
      {
        apiVersion: 'policy.open-cluster-management.io/v1',
        kind: 'PlacementBinding',
        metadata: { name: 'binding-sample-policy', namespace: 'policies' },
      },
    ]
      .map((d) => yaml.dump(d))
      .join('---\n');

    const req = baseRequest();
    req.placement = {
      mode: 'clusterSets',
      clusterSets: ['global', 'default'],
      labelSelector: { matchLabels: {}, matchExpressions: [] },
      matchExpressions: [],
    };

    const out = injectClusterSets(generated, req);
    const docs = yaml.loadAll(out) as Record<string, unknown>[];
    expect(docs.filter((d) => d.kind === 'ManagedClusterSetBinding')).toHaveLength(2);
    const placement = docs.find((d) => d.kind === 'Placement') as {
      spec: { clusterSets: string[] };
    };
    expect(placement.spec.clusterSets).toEqual(['global', 'default']);
  });
});
