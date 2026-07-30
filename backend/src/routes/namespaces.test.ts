import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  listNamespaces: vi.fn(async () => ['default', 'policies', 'open-cluster-management']),
}));

import namespacesRouter from './namespaces.js';
import { listNamespaces } from '../services/kubeClient.js';

describe('GET /api/namespaces', () => {
  const app = express();
  app.use('/api/namespaces', namespacesRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns namespaces from the cluster', async () => {
    const res = await request(app).get('/api/namespaces');
    expect(res.status).toBe(200);
    expect(res.body.namespaces).toEqual([
      'default',
      'policies',
      'open-cluster-management',
    ]);
    expect(listNamespaces).toHaveBeenCalledOnce();
  });

  it('returns 500 with empty list on kube errors', async () => {
    vi.mocked(listNamespaces).mockRejectedValueOnce(new Error('forbidden'));
    const res = await request(app).get('/api/namespaces');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/forbidden/i);
    expect(res.body.namespaces).toEqual([]);
  });
});
