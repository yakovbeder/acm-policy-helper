import { Router, type Request, type Response } from 'express';
import {
  getPolicy,
  getPolicyBundle,
  NotFoundError,
} from '../services/kubeClient.js';

const router = Router();

router.get('/:namespace/:name/bundle', async (req: Request, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const bundle = await getPolicyBundle(namespace, name);
    res.json(bundle);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('Get policy bundle error:', message);
    res.status(500).json({ error: message });
  }
});

router.get('/:namespace/:name', async (req: Request, res: Response) => {
  try {
    const { namespace, name } = req.params;
    const policy = await getPolicy(namespace, name);
    res.json({ policy });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('Get policy error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
