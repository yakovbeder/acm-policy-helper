import { Router, type Request, type Response } from 'express';
import { logger } from '../logger.js';
import { listManagedClusterLabels } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const catalog = await listManagedClusterLabels();
    res.json(catalog);
  } catch (err: unknown) {
    logger.error({ err, route: 'GET /api/cluster-labels' }, 'List managed cluster labels error');
    res.status(500).json({ error: 'Failed to list managed cluster labels', keys: [], valuesByKey: {} });
  }
});

export default router;
