import { describe, expect, it } from 'vitest';
import { hydrateFormFromPolicyBundle } from './policyHydrate';

describe('hydrateFormFromPolicyBundle', () => {
  it('hydrates a consolidated ConfigurationPolicy into multiple manifests', () => {
    const result = hydrateFormFromPolicyBundle({
      policy: {
        apiVersion: 'policy.open-cluster-management.io/v1',
        kind: 'Policy',
        metadata: {
          name: 'demo',
          namespace: 'policies',
          annotations: {
            'policy.open-cluster-management.io/standards': 'NIST SP 800-53',
            'policy.open-cluster-management.io/categories': 'CM Configuration Management',
            'policy.open-cluster-management.io/controls': 'CM-2 Baseline Configuration',
            'policy.open-cluster-management.io/description': 'Demo policy',
          },
          resourceVersion: '123',
        },
        spec: {
          disabled: false,
          remediationAction: 'inform',
          'policy-templates': [
            {
              objectDefinition: {
                apiVersion: 'policy.open-cluster-management.io/v1',
                kind: 'ConfigurationPolicy',
                metadata: { name: 'demo' },
                spec: {
                  remediationAction: 'inform',
                  severity: 'high',
                  pruneObjectBehavior: 'None',
                  'object-templates': [
                    {
                      complianceType: 'musthave',
                      objectDefinition: {
                        apiVersion: 'v1',
                        kind: 'ConfigMap',
                        metadata: { name: 'a' },
                      },
                    },
                    {
                      complianceType: 'mustonlyhave',
                      objectDefinition: {
                        apiVersion: 'v1',
                        kind: 'Secret',
                        metadata: { name: 'b' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    expect(result.form.policyName).toBe('demo');
    expect(result.form.namespace).toBe('policies');
    expect(result.form.description).toBe('Demo policy');
    expect(result.form.severity).toBe('high');
    expect(result.form.consolidateManifests).toBe(true);
    expect(result.form.manifests).toHaveLength(2);
    expect(result.form.manifests[0].content).toContain('kind: ConfigMap');
    expect(result.form.manifests[1].complianceType).toBe('mustonlyhave');
    expect(result.sourcePolicyResourceVersion).toBe('123');
  });

  it('sets consolidateManifests false for multiple ConfigurationPolicies', () => {
    const result = hydrateFormFromPolicyBundle({
      policy: {
        metadata: { name: 'oauth', namespace: 'global-policies' },
        spec: {
          remediationAction: 'enforce',
          'policy-templates': [
            {
              objectDefinition: {
                kind: 'ConfigurationPolicy',
                metadata: { name: 'policy-oauth-binding' },
                spec: {
                  'object-templates': [
                    {
                      complianceType: 'musthave',
                      objectDefinition: {
                        apiVersion: 'rbac.authorization.k8s.io/v1',
                        kind: 'ClusterRoleBinding',
                        metadata: { name: 'binding' },
                      },
                    },
                  ],
                },
              },
            },
            {
              objectDefinition: {
                kind: 'ConfigurationPolicy',
                metadata: { name: 'policy-oauth-secret' },
                spec: {
                  'object-templates': [
                    {
                      complianceType: 'mustonlyhave',
                      objectDefinition: {
                        apiVersion: 'v1',
                        kind: 'Secret',
                        metadata: { name: 'secret' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    });

    expect(result.form.consolidateManifests).toBe(false);
    expect(result.form.manifests).toHaveLength(2);
    expect(result.form.manifests[0].configPolicyName).toBe('policy-oauth-binding');
    expect(result.form.manifests[1].configPolicyName).toBe('policy-oauth-secret');
    expect(result.form.manifests[1].complianceType).toBe('mustonlyhave');
  });

  it('hydrates placement label selectors', () => {
    const result = hydrateFormFromPolicyBundle({
      policy: {
        metadata: { name: 'p', namespace: 'ns' },
        spec: { 'policy-templates': [] },
      },
      placement: {
        kind: 'Placement',
        spec: {
          predicates: [
            {
              requiredClusterSelector: {
                labelSelector: {
                  matchLabels: { env: 'prod' },
                  matchExpressions: [{ key: 'vendor', operator: 'In', values: ['OpenShift'] }],
                },
              },
            },
          ],
        },
      },
    });

    expect(result.form.placement.mode).toBe('labelSelector');
    expect(result.form.placement.labelSelector.matchLabels).toEqual({ env: 'prod' });
    expect(result.form.placement.labelSelector.matchExpressions).toHaveLength(1);
  });

  it('warns on unsupported template kinds', () => {
    const result = hydrateFormFromPolicyBundle({
      policy: {
        metadata: { name: 'p', namespace: 'ns' },
        spec: {
          'policy-templates': [
            {
              objectDefinition: {
                kind: 'CertificatePolicy',
                metadata: { name: 'cert' },
              },
            },
          ],
        },
      },
    });
    expect(result.warnings[0]).toMatch(/CertificatePolicy/);
    expect(result.form.manifests).toHaveLength(0);
  });
});
