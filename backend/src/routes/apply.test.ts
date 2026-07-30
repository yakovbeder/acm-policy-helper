import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  applyYaml: vi.fn(async () => [
    { kind: 'Policy', name: 'demo', namespace: 'policies', status: 'created' },
  ]),
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
    expect(res.body.error).toMatch(/yaml/i);
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
      { kind: 'Placement', name: 'p', status: 'error', message: 'denied' },
    ]);
    const res = await request(app).post('/api/apply').send({ yaml: 'kind: Policy\n' });
    expect(res.status).toBe(207);
  });
});
