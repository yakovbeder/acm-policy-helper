import { Router, type Request, type Response } from 'express';
import { logger } from '../logger.js';
import { getConsoleUrl } from '../services/kubeClient.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const consoleUrl = await getConsoleUrl();
    res.json({ consoleUrl });
  } catch (err: unknown) {
    logger.error({ err, route: 'GET /api/console-url' }, 'Console URL error');
    res.status(500).json({ error: 'Failed to get console URL', consoleUrl: null });
  }
});

export default router;
