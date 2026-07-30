import { Router, type Request, type Response } from 'express';
import { listManagedClusterSets } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const clusterSets = await listManagedClusterSets();
    res.json({ clusterSets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List ManagedClusterSets error:', message);
    res.status(500).json({ error: message, clusterSets: [] });
  }
});

export default router;
