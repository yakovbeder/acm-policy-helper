import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import { logger } from './logger.js';
import applyRouter from './routes/apply.js';
import clusterLabelsRouter from './routes/clusterLabels.js';
import clusterSetsRouter from './routes/clusterSets.js';
import consoleUrlRouter from './routes/consoleUrl.js';
import generateRouter from './routes/generate.js';
import namespacesRouter from './routes/namespaces.js';
import placementTargetsRouter from './routes/placementTargets.js';
import policiesRouter from './routes/policies.js';
import { listNamespaces } from './services/kubeClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_TIMEOUT_MS = 30_000;
export const APPLY_TIMEOUT_MS = 60_000;

/** Request timeout for a path: apply gets a longer window for multi-doc bundles. */
export function requestTimeoutMs(pathname: string): number {
  return pathname.startsWith('/api/apply') ? APPLY_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

export const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin }));
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const timeoutMs = requestTimeoutMs(req.path);
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['text/*', 'application/yaml'], limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    user: _req.header('x-forwarded-user') || null,
  });
});

app.get('/api/health/ready', async (_req, res) => {
  const policyGeneratorBin =
    process.env.POLICY_GENERATOR_BIN || '/usr/local/bin/PolicyGenerator';

  try {
    await access(policyGeneratorBin);
  } catch {
    logger.error({ policyGeneratorBin }, 'PolicyGenerator binary missing');
    res.status(503).json({ status: 'not ready', reason: 'PolicyGenerator binary missing' });
    return;
  }

  try {
    await listNamespaces();
    res.json({ status: 'ready' });
  } catch (err: unknown) {
    logger.error({ err }, 'Readiness check failed');
    res.status(503).json({ status: 'not ready', reason: 'Kubernetes API unavailable' });
  }
});

app.use('/api/generate', generateRouter);
app.use('/api/apply', applyRouter);
app.use('/api/namespaces', namespacesRouter);
app.use('/api/cluster-sets', clusterSetsRouter);
app.use('/api/cluster-labels', clusterLabelsRouter);
app.use('/api/console-url', consoleUrlRouter);
app.use('/api/placement-targets', placementTargetsRouter);
app.use('/api/policies', policiesRouter);

const publicDir = process.env.PUBLIC_DIR || path.join(__dirname, '../public');
app.use(express.static(publicDir));
// Express 5 / path-to-regexp: bare '*' is invalid; use a named wildcard.
app.get('/{*path}', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});
