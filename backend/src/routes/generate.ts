import { Router, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { generatePolicyYaml } from '../services/policyGenerator.js';
import { formatZodError, GenerateRequestSchema } from '../validation.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = GenerateRequestSchema.parse(req.body);
    const yamlOutput = await generatePolicyYaml(body);
    res.json({ yaml: yamlOutput });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json(formatZodError(err));
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, route: 'POST /api/generate' }, 'Generate error');
    // Generator validation failures are client errors; keep the specific message.
    res.status(400).json({ error: message });
  }
});

export default router;
