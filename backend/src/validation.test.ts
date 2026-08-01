import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  ApplyRequestSchema,
  formatZodError,
  GenerateRequestSchema,
} from './validation.js';

const validGenerate = () => ({
  policyName: 'demo-policy',
  namespace: 'policies',
  remediationAction: 'inform' as const,
  severity: 'low' as const,
  complianceType: 'musthave' as const,
  placement: {
    mode: 'labelSelector' as const,
    labelSelector: { matchLabels: { env: 'prod' }, matchExpressions: [] },
  },
  manifests: [{ name: 'cm.yaml', content: 'kind: ConfigMap\n' }],
});

describe('GenerateRequestSchema', () => {
  it('accepts a valid generate request', () => {
    expect(() => GenerateRequestSchema.parse(validGenerate())).not.toThrow();
  });

  it('accepts clusterSets placement mode', () => {
    const body = {
      ...validGenerate(),
      placement: {
        mode: 'clusterSets' as const,
        clusterSets: ['default'],
        matchExpressions: [{ key: 'vendor', operator: 'In' as const, values: ['OpenShift'] }],
      },
    };
    expect(() => GenerateRequestSchema.parse(body)).not.toThrow();
  });

  it('rejects invalid Kubernetes policy names', () => {
    const body = validGenerate();
    body.policyName = 'Invalid_Name!';
    const result = GenerateRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('policyName'))).toBe(true);
    }
  });

  it('rejects invalid remediationAction and severity enums', () => {
    const body = {
      ...validGenerate(),
      remediationAction: 'delete',
      severity: 'urgent',
    };
    const result = GenerateRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
  });

  it('requires at least one manifest', () => {
    const body = validGenerate();
    body.manifests = [];
    const result = GenerateRequestSchema.safeParse(body);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('manifests'))).toBe(true);
    }
  });

  it('rejects unknown placement mode', () => {
    const body = {
      ...validGenerate(),
      placement: { mode: 'everywhere' },
    };
    expect(GenerateRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe('ApplyRequestSchema', () => {
  it('accepts non-empty yaml', () => {
    expect(ApplyRequestSchema.parse({ yaml: 'kind: Policy\n' }).yaml).toContain('Policy');
  });

  it('rejects missing yaml', () => {
    expect(ApplyRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects whitespace-only yaml', () => {
    expect(ApplyRequestSchema.safeParse({ yaml: '   \n\t  ' }).success).toBe(false);
  });
});

describe('formatZodError', () => {
  it('maps issues to field/message details', () => {
    try {
      ApplyRequestSchema.parse({});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
      const formatted = formatZodError(err as ZodError);
      expect(formatted.error).toBe('Validation failed');
      expect(formatted.details.length).toBeGreaterThan(0);
      expect(formatted.details[0]).toEqual(
        expect.objectContaining({
          field: expect.any(String),
          message: expect.any(String),
        })
      );
    }
  });
});
