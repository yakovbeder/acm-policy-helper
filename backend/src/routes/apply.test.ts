import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ApplyClientError } = vi.hoisted(() => {
  class ApplyClientError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ApplyClientError';
    }
  }
  return { ApplyClientError };
});

vi.mock('../services/kubeClient.js', () => ({
  applyYaml: vi.fn(async () => [
    { kind: 'Policy', name: 'demo', namespace: 'policies', status: 'created' },
  ]),
  ApplyClientError,
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import applyRouter from './apply.js';
import { applyYaml } from '../services/kubeClient.js';

describe('POST /api/apply', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/apply', applyRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires yaml', async () => {
    const res = await request(app).post('/api/apply').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.some((d: { field: string }) => d.field === 'yaml')).toBe(true);
  });

  it('rejects whitespace-only yaml', async () => {
    const res = await request(app).post('/api/apply').send({ yaml: '  \n  ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(applyYaml).not.toHaveBeenCalled();
  });

  it('applies yaml and returns results', async () => {
    const res = await request(app)
      .post('/api/apply')
      .send({ yaml: 'kind: Policy\nmetadata:\n  name: demo\n' });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe('created');
    expect(applyYaml).toHaveBeenCalledOnce();
  });

  it('returns 207 when some resources fail', async () => {
    vi.mocked(applyYaml).mockResolvedValueOnce([
      { kind: 'Policy', name: 'demo', status: 'created' },
      { kind: 'Placement', name: 'p', status: 'error', message: 'Failed to apply resource' },
    ]);
    const res = await request(app).post('/api/apply').send({ yaml: 'kind: Policy\n' });
    expect(res.status).toBe(207);
  });

  it('returns 400 for ApplyClientError without calling through as 500', async () => {
    vi.mocked(applyYaml).mockRejectedValueOnce(
      new ApplyClientError('No Kubernetes resources found in YAML')
    );
    const res = await request(app).post('/api/apply').send({ yaml: 'kind: Policy\n' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No Kubernetes resources found in YAML');
  });

  it('returns a generic 500 without leaking kube details', async () => {
    vi.mocked(applyYaml).mockRejectedValueOnce(
      new Error('Unauthorized: Bearer token invalid at api-server.internal:6443')
    );
    const res = await request(app).post('/api/apply').send({ yaml: 'kind: Policy\n' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to apply YAML');
    expect(JSON.stringify(res.body)).not.toMatch(/Bearer|Unauthorized|api-server\.internal/i);
  });
});
