import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  listManagedClusterSets: vi.fn(async () => ['default', 'global', 'hub']),
}));

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import clusterSetsRouter from './clusterSets.js';
import { listManagedClusterSets } from '../services/kubeClient.js';

describe('GET /api/cluster-sets', () => {
  const app = express();
  app.use('/api/cluster-sets', clusterSetsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ManagedClusterSets from the hub', async () => {
    const res = await request(app).get('/api/cluster-sets');
    expect(res.status).toBe(200);
    expect(res.body.clusterSets).toEqual(['default', 'global', 'hub']);
    expect(listManagedClusterSets).toHaveBeenCalledOnce();
  });

  it('returns 500 with empty list on kube errors', async () => {
    vi.mocked(listManagedClusterSets).mockRejectedValueOnce(
      new Error('User "system:serviceaccount:x" cannot list resource')
    );
    const res = await request(app).get('/api/cluster-sets');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to list ManagedClusterSets');
    expect(res.body.clusterSets).toEqual([]);
    expect(JSON.stringify(res.body)).not.toMatch(/system:serviceaccount/);
  });
});
