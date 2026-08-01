import { Router, type Request, type Response } from 'express';
import { logger } from '../logger.js';
import {
  getPolicy,
  getPolicyBundle,
  NotFoundError,
} from '../services/kubeClient.js';

const router = Router();

router.get('/:namespace/:name/bundle', async (req: Request<{ namespace: string; name: string }>, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const bundle = await getPolicyBundle(namespace, name);
    res.json(bundle);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error({ err, route: 'GET /api/policies/:namespace/:name/bundle' }, 'Get policy bundle error');
    res.status(500).json({ error: 'Failed to get policy bundle' });
  }
});

router.get('/:namespace/:name', async (req: Request<{ namespace: string; name: string }>, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const policy = await getPolicy(namespace, name);
    res.json({ policy });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error({ err, route: 'GET /api/policies/:namespace/:name' }, 'Get policy error');
    res.status(500).json({ error: 'Failed to get policy' });
  }
});

export default router;
