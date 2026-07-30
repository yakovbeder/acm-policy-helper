import { afterEach, describe, expect, it } from 'vitest';
import {
  listManagedClusterLabels,
  listManagedClusterSets,
  listNamespaces,
} from './kubeClient.js';

describe('cluster catalog disable flag', () => {
  afterEach(() => {
    delete process.env.DISABLE_CLUSTER_CATALOG;
  });

  it('returns empty catalogs when DISABLE_CLUSTER_CATALOG=true', async () => {
    process.env.DISABLE_CLUSTER_CATALOG = 'true';
    await expect(listNamespaces()).resolves.toEqual([]);
    await expect(listManagedClusterSets()).resolves.toEqual([]);
    await expect(listManagedClusterLabels()).resolves.toEqual({
      keys: [],
      valuesByKey: {},
    });
  });
});
