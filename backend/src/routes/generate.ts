import { Router, type Request, type Response } from 'express';
import { generatePolicyYaml } from '../services/policyGenerator.js';
import type { GenerateRequest } from '../types.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateRequest;
    const yamlOutput = await generatePolicyYaml(body);
    res.json({ yaml: yamlOutput });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Generate error:', message);
    res.status(400).json({ error: message });
  }
});

export default router;
