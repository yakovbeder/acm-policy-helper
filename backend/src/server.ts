import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import applyRouter from './routes/apply.js';
import clusterLabelsRouter from './routes/clusterLabels.js';
import clusterSetsRouter from './routes/clusterSets.js';
import consoleUrlRouter from './routes/consoleUrl.js';
import generateRouter from './routes/generate.js';
import namespacesRouter from './routes/namespaces.js';
import placementTargetsRouter from './routes/placementTargets.js';
import policiesRouter from './routes/policies.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['text/*', 'application/yaml'], limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    user: _req.header('x-forwarded-user') || null,
  });
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
app.get('*', (req, res, next) => {
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

app.listen(port, () => {
  console.log(`ACM Policy Helper listening on port ${port}`);
});
