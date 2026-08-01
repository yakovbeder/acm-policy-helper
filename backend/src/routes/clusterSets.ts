import { Router, type Request, type Response } from 'express';
import { logger } from '../logger.js';
import { listManagedClusterSets } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const clusterSets = await listManagedClusterSets();
    res.json({ clusterSets });
  } catch (err: unknown) {
    logger.error({ err, route: 'GET /api/cluster-sets' }, 'List ManagedClusterSets error');
    res.status(500).json({ error: 'Failed to list ManagedClusterSets', clusterSets: [] });
  }
});

export default router;
