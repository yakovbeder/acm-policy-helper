import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../services/kubeClient.js', () => ({
  getPolicy: vi.fn(async () => ({
    apiVersion: 'policy.open-cluster-management.io/v1',
    kind: 'Policy',
    metadata: { name: 'demo', namespace: 'policies' },
  })),
  getPolicyBundle: vi.fn(async () => ({
    policy: {
      apiVersion: 'policy.open-cluster-management.io/v1',
      kind: 'Policy',
      metadata: { name: 'demo', namespace: 'policies' },
    },
    placement: {
      kind: 'Placement',
      metadata: { name: 'placement-demo' },
    },
  })),
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  },
}));

import { getPolicy, getPolicyBundle, NotFoundError } from '../services/kubeClient.js';
import policiesRouter from './policies.js';

function makeApp() {
  const app = express();
  app.use('/api/policies', policiesRouter);
  return app;
}

describe('GET /api/policies/:namespace/:name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a policy', async () => {
    const res = await request(makeApp()).get('/api/policies/policies/demo');
    expect(res.status).toBe(200);
    expect(res.body.policy.metadata.name).toBe('demo');
    expect(getPolicy).toHaveBeenCalledWith('policies', 'demo');
  });

  it('returns 404 when missing', async () => {
    vi.mocked(getPolicy).mockRejectedValueOnce(new NotFoundError('not found'));
    const res = await request(makeApp()).get('/api/policies/policies/missing');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('GET /api/policies/:namespace/:name/bundle', () => {
  it('returns policy bundle', async () => {
    const res = await request(makeApp()).get('/api/policies/policies/demo/bundle');
    expect(res.status).toBe(200);
    expect(res.body.policy.metadata.name).toBe('demo');
    expect(res.body.placement.kind).toBe('Placement');
    expect(getPolicyBundle).toHaveBeenCalledWith('policies', 'demo');
  });
});
