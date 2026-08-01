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

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
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

  it('returns a generic 500 message without leaking internals', async () => {
    vi.mocked(getPolicy).mockRejectedValueOnce(new Error('ECONNREFUSED api-server.internal:6443'));
    const res = await request(makeApp()).get('/api/policies/policies/demo');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get policy');
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|api-server\.internal/);
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

  it('returns a generic 500 message for bundle failures', async () => {
    vi.mocked(getPolicyBundle).mockRejectedValueOnce(
      new Error('token expired at /var/run/secrets/kubernetes.io/serviceaccount/token')
    );
    const res = await request(makeApp()).get('/api/policies/policies/demo/bundle');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get policy bundle');
    expect(JSON.stringify(res.body)).not.toMatch(/token expired|serviceaccount/);
  });
});
