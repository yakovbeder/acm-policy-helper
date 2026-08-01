import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/policyGenerator.js', () => ({
  generatePolicyYaml: vi.fn(async () => 'kind: Policy\nmetadata:\n  name: demo\n'),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import generateRouter from './generate.js';
import { generatePolicyYaml } from '../services/policyGenerator.js';

const validBody = {
  policyName: 'demo',
  namespace: 'policies',
  remediationAction: 'inform',
  severity: 'low',
  complianceType: 'musthave',
  placement: {
    mode: 'labelSelector',
    labelSelector: { matchLabels: {}, matchExpressions: [] },
    clusterSets: [],
    matchExpressions: [],
  },
  manifests: [{ name: 'a.yaml', content: 'kind: ConfigMap\n' }],
};

describe('POST /api/generate', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/generate', generateRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns generated yaml', async () => {
    const res = await request(app).post('/api/generate').send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.yaml).toContain('kind: Policy');
    expect(generatePolicyYaml).toHaveBeenCalledOnce();
  });

  it('returns 400 with structured details on validation errors', async () => {
    const res = await request(app).post('/api/generate').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(generatePolicyYaml).not.toHaveBeenCalled();
  });

  it('rejects invalid policyName before calling the generator', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ ...validBody, policyName: 'Bad_Name!' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(
      res.body.details.some((d: { field: string }) => d.field === 'policyName')
    ).toBe(true);
    expect(generatePolicyYaml).not.toHaveBeenCalled();
  });

  it('rejects empty manifests before calling the generator', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ ...validBody, manifests: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(generatePolicyYaml).not.toHaveBeenCalled();
  });

  it('returns 400 on generator errors', async () => {
    vi.mocked(generatePolicyYaml).mockRejectedValueOnce(new Error('policyName is required'));
    const res = await request(app).post('/api/generate').send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('policyName is required');
  });
});
