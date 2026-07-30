import { Router, type Request, type Response } from 'express';
import { applyYaml } from '../services/kubeClient.js';
import type { ApplyRequest } from '../types.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as ApplyRequest;
    if (!body.yaml?.trim()) {
      res.status(400).json({ error: 'yaml is required' });
      return;
    }
    const results = await applyYaml(body.yaml);
    const failed = results.filter((r) => r.status === 'error');
    res.status(failed.length ? 207 : 200).json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Apply error:', message);
    res.status(400).json({ error: message });
  }
});

export default router;
