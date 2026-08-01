import { Router, type Request, type Response } from 'express';
import { logger } from '../logger.js';
import { listNamespaces } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const namespaces = await listNamespaces();
    res.json({ namespaces });
  } catch (err: unknown) {
    logger.error({ err, route: 'GET /api/namespaces' }, 'List namespaces error');
    res.status(500).json({ error: 'Failed to list namespaces', namespaces: [] });
  }
});

export default router;
