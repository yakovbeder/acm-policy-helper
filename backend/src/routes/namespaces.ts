import { Router, type Request, type Response } from 'express';
import { listNamespaces } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const namespaces = await listNamespaces();
    res.json({ namespaces });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List namespaces error:', message);
    res.status(500).json({ error: message, namespaces: [] });
  }
});

export default router;
