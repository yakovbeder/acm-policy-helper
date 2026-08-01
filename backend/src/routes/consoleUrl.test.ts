import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/kubeClient.js', () => ({
  getConsoleUrl: vi.fn(
    async () => 'https://console-openshift-console.apps.example.com'
  ),
}));

vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import consoleUrlRouter from './consoleUrl.js';
import { getConsoleUrl } from '../services/kubeClient.js';

describe('GET /api/console-url', () => {
  const app = express();
  app.use('/api/console-url', consoleUrlRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the console URL from the cluster', async () => {
    const res = await request(app).get('/api/console-url');
    expect(res.status).toBe(200);
    expect(res.body.consoleUrl).toBe(
      'https://console-openshift-console.apps.example.com'
    );
    expect(getConsoleUrl).toHaveBeenCalledOnce();
  });

  it('returns null when the console resource is unavailable', async () => {
    vi.mocked(getConsoleUrl).mockResolvedValueOnce(null);
    const res = await request(app).get('/api/console-url');
    expect(res.status).toBe(200);
    expect(res.body.consoleUrl).toBeNull();
  });

  it('returns 500 on kube errors', async () => {
    vi.mocked(getConsoleUrl).mockRejectedValueOnce(new Error('forbidden'));
    const res = await request(app).get('/api/console-url');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to get console URL');
    expect(res.body.consoleUrl).toBeNull();
  });
});
