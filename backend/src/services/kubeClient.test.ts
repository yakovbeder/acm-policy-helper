import { beforeEach, describe, expect, it, vi } from 'vitest';

const customApi = {
  getNamespacedCustomObject: vi.fn(),
  replaceNamespacedCustomObject: vi.fn(),
  createNamespacedCustomObject: vi.fn(),
  getClusterCustomObject: vi.fn(),
  replaceClusterCustomObject: vi.fn(),
  createClusterCustomObject: vi.fn(),
};

const kubeConfigConstructed = vi.hoisted(() => ({ count: 0 }));

vi.mock('@kubernetes/client-node', () => {
  class KubeConfig {
    loadFromCluster = vi.fn();
    loadFromFile = vi.fn();
    loadFromDefault = vi.fn();
    makeApiClient = vi.fn(() => customApi);
    constructor() {
      kubeConfigConstructed.count += 1;
    }
  }
  return {
    KubeConfig,
    CustomObjectsApi: vi.fn(),
    CoreV1Api: vi.fn(),
  };
});

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  ALLOWED_APPLY_KINDS,
  applyObject,
  applyYaml,
  getHttpStatus,
  pluralizeKind,
  resetKubeConfigCache,
} from './kubeClient.js';

describe('pluralizeKind', () => {
  it('maps known ACM irregular plurals', () => {
    expect(pluralizeKind('Policy')).toBe('policies');
    expect(pluralizeKind('Placement')).toBe('placements');
    expect(pluralizeKind('PlacementBinding')).toBe('placementbindings');
    expect(pluralizeKind('ManagedClusterSetBinding')).toBe('managedclustersetbindings');
    expect(pluralizeKind('ConfigurationPolicy')).toBe('configurationpolicies');
  });

  it('handles regular and edge cases', () => {
    expect(pluralizeKind('ConfigMap')).toBe('configmaps');
    expect(pluralizeKind('Status')).toBe('status');
    expect(pluralizeKind('Category')).toBe('categories');
  });
});

describe('getHttpStatus', () => {
  it('reads code', () => {
    expect(getHttpStatus({ code: 404 })).toBe(404);
  });

  it('reads statusCode', () => {
    expect(getHttpStatus({ statusCode: 403 })).toBe(403);
  });

  it('reads response.statusCode', () => {
    expect(getHttpStatus({ response: { statusCode: 500 } })).toBe(500);
  });

  it('returns undefined when absent', () => {
    expect(getHttpStatus({})).toBeUndefined();
    expect(getHttpStatus('x')).toBeUndefined();
  });
});

describe('applyObject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetKubeConfigCache();
  });

  it('returns error when metadata is missing', async () => {
    const result = await applyObject(customApi as never, {
      apiVersion: 'v1',
      kind: 'Policy',
      metadata: {} as { name: string },
    });
    expect(result.status).toBe('error');
    expect(result.message).toMatch(/Missing/i);
  });

  it('creates namespaced object on 404', async () => {
    customApi.getNamespacedCustomObject.mockRejectedValueOnce({ statusCode: 404 });
    customApi.createNamespacedCustomObject.mockResolvedValueOnce({});

    const result = await applyObject(customApi as never, {
      apiVersion: 'policy.open-cluster-management.io/v1',
      kind: 'Policy',
      metadata: { name: 'demo', namespace: 'policies' },
    });

    expect(result).toEqual({
      kind: 'Policy',
      name: 'demo',
      namespace: 'policies',
      status: 'created',
    });
    expect(customApi.createNamespacedCustomObject).toHaveBeenCalledOnce();
  });

  it('updates namespaced object when it exists', async () => {
    customApi.getNamespacedCustomObject.mockResolvedValueOnce({
      metadata: { name: 'demo', namespace: 'policies', resourceVersion: '9' },
    });
    customApi.replaceNamespacedCustomObject.mockResolvedValueOnce({});

    const result = await applyObject(customApi as never, {
      apiVersion: 'policy.open-cluster-management.io/v1',
      kind: 'Policy',
      metadata: { name: 'demo', namespace: 'policies' },
    });

    expect(result.status).toBe('updated');
    expect(customApi.replaceNamespacedCustomObject).toHaveBeenCalledOnce();
  });

  it('creates cluster-scoped object on 404', async () => {
    customApi.getClusterCustomObject.mockRejectedValueOnce({ code: 404 });
    customApi.createClusterCustomObject.mockResolvedValueOnce({});

    const result = await applyObject(customApi as never, {
      apiVersion: 'cluster.open-cluster-management.io/v1beta2',
      kind: 'ManagedClusterSetBinding',
      metadata: { name: 'global' },
    });

    expect(result.status).toBe('created');
    expect(customApi.createClusterCustomObject).toHaveBeenCalledOnce();
  });
});

describe('applyYaml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetKubeConfigCache();
    kubeConfigConstructed.count = 0;
  });

  it('caches KubeConfig across apply calls', async () => {
    customApi.getNamespacedCustomObject.mockRejectedValue({ statusCode: 404 });
    customApi.createNamespacedCustomObject.mockResolvedValue({});
    const yaml = `
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: demo
  namespace: policies
`;
    await applyYaml(yaml);
    await applyYaml(yaml);
    expect(kubeConfigConstructed.count).toBe(1);
  });

  it('rejects empty YAML', async () => {
    await expect(applyYaml('')).rejects.toThrow(/No Kubernetes resources/);
  });

  it('rejects disallowed kinds without calling the API', async () => {
    const results = await applyYaml(`
apiVersion: v1
kind: ConfigMap
metadata:
  name: evil
  namespace: default
`);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('error');
    expect(results[0].message).toMatch(/not allowed/i);
    expect(ALLOWED_APPLY_KINDS.has('ConfigMap')).toBe(false);
    expect(customApi.getNamespacedCustomObject).not.toHaveBeenCalled();
  });

  it('applies allowed Policy documents', async () => {
    customApi.getNamespacedCustomObject.mockRejectedValueOnce({ statusCode: 404 });
    customApi.createNamespacedCustomObject.mockResolvedValueOnce({});

    const results = await applyYaml(`
apiVersion: policy.open-cluster-management.io/v1
kind: Policy
metadata:
  name: demo
  namespace: policies
`);
    expect(results).toEqual([
      { kind: 'Policy', name: 'demo', namespace: 'policies', status: 'created' },
    ]);
  });

  it('rejects too many documents', async () => {
    const docs = Array.from({ length: 51 }, (_, i) =>
      [
        'apiVersion: policy.open-cluster-management.io/v1',
        'kind: Policy',
        'metadata:',
        `  name: p-${i}`,
        '  namespace: policies',
      ].join('\n')
    ).join('\n---\n');

    await expect(applyYaml(docs)).rejects.toThrow(/Too many resources/);
  });
});
