import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const listNamespaces = vi.hoisted(() => vi.fn(async () => ['default']));
const accessMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('./services/kubeClient.js', () => ({
  listNamespaces: listNamespaces,
}));

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: accessMock,
  };
});

async function loadApp(): Promise<Express> {
  vi.resetModules();
  const mod = await import('./app.js');
  return mod.app;
}

describe('requestTimeoutMs', () => {
  it('uses 60s for apply and 30s elsewhere', async () => {
    const { requestTimeoutMs, APPLY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS } = await import('./app.js');
    expect(requestTimeoutMs('/api/apply')).toBe(APPLY_TIMEOUT_MS);
    expect(requestTimeoutMs('/api/apply/')).toBe(APPLY_TIMEOUT_MS);
    expect(requestTimeoutMs('/api/generate')).toBe(DEFAULT_TIMEOUT_MS);
    expect(requestTimeoutMs('/api/health')).toBe(DEFAULT_TIMEOUT_MS);
    expect(APPLY_TIMEOUT_MS).toBe(60_000);
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
  });
});

describe('GET /api/health', () => {
  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
    listNamespaces.mockReset().mockResolvedValue(['default']);
    accessMock.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('returns ok and optional forwarded user', async () => {
    const app = await loadApp();
    const res = await request(app)
      .get('/api/health')
      .set('x-forwarded-user', 'alice');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', user: 'alice' });
  });
});

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
    listNamespaces.mockReset().mockResolvedValue(['default']);
    accessMock.mockReset().mockResolvedValue(undefined);
    process.env.POLICY_GENERATOR_BIN = '/tmp/fake-PolicyGenerator';
  });

  afterEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.POLICY_GENERATOR_BIN;
  });

  it('returns ready when binary exists and kube catalog responds', async () => {
    const app = await loadApp();
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' });
    expect(accessMock).toHaveBeenCalledWith('/tmp/fake-PolicyGenerator');
    expect(listNamespaces).toHaveBeenCalledOnce();
  });

  it('returns 503 when PolicyGenerator binary is missing', async () => {
    accessMock.mockRejectedValueOnce(new Error('ENOENT'));
    const app = await loadApp();
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'not ready',
      reason: 'PolicyGenerator binary missing',
    });
    expect(listNamespaces).not.toHaveBeenCalled();
  });

  it('returns 503 when Kubernetes API is unavailable', async () => {
    listNamespaces.mockRejectedValueOnce(new Error('forbidden'));
    const app = await loadApp();
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: 'not ready',
      reason: 'Kubernetes API unavailable',
    });
  });
});

describe('CORS', () => {
  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('does not emit Access-Control-Allow-Origin when CORS_ORIGIN is unset', async () => {
    delete process.env.CORS_ORIGIN;
    listNamespaces.mockResolvedValue([]);
    accessMock.mockResolvedValue(undefined);
    const app = await loadApp();
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the configured CORS_ORIGIN', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    listNamespaces.mockResolvedValue([]);
    accessMock.mockResolvedValue(undefined);
    const app = await loadApp();
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
