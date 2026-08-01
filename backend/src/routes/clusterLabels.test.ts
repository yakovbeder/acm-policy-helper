import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  listManagedClusterLabels: vi.fn(async () => ({
    keys: ['name', 'vendor'],
    valuesByKey: {
      name: ['local-cluster'],
      vendor: ['OpenShift'],
    },
  })),
}));

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import clusterLabelsRouter from './clusterLabels.js';
import { listManagedClusterLabels } from '../services/kubeClient.js';

describe('GET /api/cluster-labels', () => {
  const app = express();
  app.use('/api/cluster-labels', clusterLabelsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns managed cluster label catalog', async () => {
    const res = await request(app).get('/api/cluster-labels');
    expect(res.status).toBe(200);
    expect(res.body.keys).toEqual(['name', 'vendor']);
    expect(res.body.valuesByKey.vendor).toEqual(['OpenShift']);
    expect(listManagedClusterLabels).toHaveBeenCalledOnce();
  });
});
