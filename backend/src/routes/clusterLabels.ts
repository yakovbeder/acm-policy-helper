import { Router, type Request, type Response } from 'express';
import { listManagedClusterLabels } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const catalog = await listManagedClusterLabels();
    res.json(catalog);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List managed cluster labels error:', message);
    res.status(500).json({ error: message, keys: [], valuesByKey: {} });
  }
});

export default router;
