import { Router, type Request, type Response } from 'express';
import { listPlacementTargets } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const namespace = typeof req.query.namespace === 'string' ? req.query.namespace : '';
  if (!namespace.trim()) {
    res.status(400).json({
      error: 'Query parameter "namespace" is required',
      namespace: '',
      clusterSets: [],
      clusters: [],
    });
    return;
  }

  try {
    const targets = await listPlacementTargets(namespace);
    res.json(targets);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List placement targets error:', message);
    res.status(500).json({
      error: message,
      namespace: namespace.trim(),
      clusterSets: [],
      clusters: [],
    });
  }
});

export default router;
