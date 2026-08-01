import { Router, type Request, type Response } from 'express';
import { getConsoleUrl } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const consoleUrl = await getConsoleUrl();
    res.json({ consoleUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Console URL error:', message);
    res.status(500).json({ error: message, consoleUrl: null });
  }
});

export default router;
