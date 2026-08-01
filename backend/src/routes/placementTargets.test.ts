import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  listPlacementTargets: vi.fn(async (namespace: string) => ({
    namespace,
    clusterSets: ['default', 'managed'],
    clusters: ['local-cluster'],
  })),
}));

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import placementTargetsRouter from './placementTargets.js';
import { listPlacementTargets } from '../services/kubeClient.js';

describe('GET /api/placement-targets', () => {
  const app = express();
  app.use('/api/placement-targets', placementTargetsRouter);

  beforeEach(() => {
    vi.mocked(listPlacementTargets).mockClear();
  });

  it('requires namespace query parameter', async () => {
    const res = await request(app).get('/api/placement-targets');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/namespace/i);
    expect(listPlacementTargets).not.toHaveBeenCalled();
  });

  it('returns bound cluster sets and clusters for a namespace', async () => {
    const res = await request(app).get('/api/placement-targets').query({ namespace: 'acm-policy' });
    expect(res.status).toBe(200);
    expect(listPlacementTargets).toHaveBeenCalledWith('acm-policy');
    expect(res.body).toEqual({
      namespace: 'acm-policy',
      clusterSets: ['default', 'managed'],
      clusters: ['local-cluster'],
    });
  });

  it('returns empty lists on kube errors', async () => {
    vi.mocked(listPlacementTargets).mockRejectedValueOnce(new Error('forbidden'));
    const res = await request(app).get('/api/placement-targets').query({ namespace: 'acm-policy' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to list placement targets');
    expect(res.body.clusterSets).toEqual([]);
    expect(res.body.clusters).toEqual([]);
  });
});
