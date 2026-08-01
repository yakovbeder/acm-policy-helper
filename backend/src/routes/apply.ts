import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { applyYaml } from '../services/kubeClient.js';
import { ApplyRequestSchema, formatZodError } from '../validation.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = ApplyRequestSchema.parse(req.body);
    const results = await applyYaml(body.yaml);
    const failed = results.filter((r) => r.status === 'error');
    res.status(failed.length ? 207 : 200).json({ results });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json(formatZodError(err));
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, route: 'POST /api/apply' }, 'Apply error');
    // YAML parse / empty-doc failures are client errors.
    res.status(400).json({ error: message });
  }
});

export default router;
