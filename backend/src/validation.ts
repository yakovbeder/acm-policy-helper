import { z } from 'zod';

const k8sNameRegex = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

const MatchExpressionSchema = z.object({
  key: z.string().min(1),
  operator: z.enum(['In', 'NotIn', 'Exists', 'DoesNotExist']),
  values: z.array(z.string()).optional(),
});

const LabelSelectorSchema = z.object({
  matchLabels: z.record(z.string(), z.string()).optional(),
  matchExpressions: z.array(MatchExpressionSchema).optional(),
});

const PlacementConfigSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('labelSelector'),
    labelSelector: LabelSelectorSchema.optional(),
    clusterSets: z.array(z.string()).optional(),
    matchExpressions: z.array(MatchExpressionSchema).optional(),
  }),
  z.object({
    mode: z.literal('clusterSets'),
    labelSelector: LabelSelectorSchema.optional(),
    clusterSets: z.array(z.string()).optional(),
    matchExpressions: z.array(MatchExpressionSchema).optional(),
  }),
]);

const ComplianceTypeSchema = z.enum(['musthave', 'mustonlyhave', 'mustnothave']);

const ManifestInputSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  configPolicyName: z.string().optional(),
  complianceType: ComplianceTypeSchema.optional(),
});

export const GenerateRequestSchema = z.object({
  policyName: z
    .string()
    .min(1)
    .max(253)
    .regex(k8sNameRegex, 'policyName must be a valid DNS subdomain name'),
  namespace: z
    .string()
    .min(1)
    .max(253)
    .regex(k8sNameRegex, 'namespace must be a valid DNS subdomain name'),
  remediationAction: z.enum(['inform', 'enforce']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  complianceType: ComplianceTypeSchema,
  description: z.string().optional(),
  disabled: z.boolean().optional(),
  pruneObjectBehavior: z.enum(['None', 'DeleteAll', 'DeleteIfCreated']).optional(),
  standards: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  controls: z.array(z.string()).optional(),
  consolidateManifests: z.boolean().optional(),
  placement: PlacementConfigSchema,
  manifests: z.array(ManifestInputSchema).min(1),
});

export const ApplyRequestSchema = z.object({
  yaml: z.string().trim().min(1, 'yaml is required'),
});

export function formatZodError(err: z.ZodError): {
  error: string;
  details: Array<{ field: string; message: string }>;
} {
  return {
    error: 'Validation failed',
    details: err.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}
