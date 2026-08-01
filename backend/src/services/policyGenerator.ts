import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { dump, loadAll } from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import type { GenerateRequest, MatchExpression } from '../types.js';

const execFileAsync = promisify(execFile);

const POLICY_GENERATOR_BIN =
  process.env.POLICY_GENERATOR_BIN || '/usr/local/bin/PolicyGenerator';

export function sanitizeFileName(name: string, index: number): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '') || `manifest-${index}`;
  return base.endsWith('.yaml') || base.endsWith('.yml') ? base : `${base}.yaml`;
}

/** Derive a ConfigurationPolicy name from an optional override or filename stem. */
export function configPolicyNameFromManifest(
  manifest: { name?: string; configPolicyName?: string },
  index: number
): string {
  if (manifest.configPolicyName?.trim()) {
    return manifest.configPolicyName.trim();
  }
  const fileName = sanitizeFileName(manifest.name || `manifest-${index}`, index);
  return fileName.replace(/\.(ya?ml)$/i, '') || `manifest-${index}`;
}

function buildLabelSelector(req: GenerateRequest): Record<string, unknown> | undefined {
  if (req.placement.mode === 'labelSelector') {
    const ls = req.placement.labelSelector || {};
    const result: Record<string, unknown> = {};
    if (ls.matchLabels && Object.keys(ls.matchLabels).length > 0) {
      result.matchLabels = ls.matchLabels;
    }
    if (ls.matchExpressions && ls.matchExpressions.length > 0) {
      result.matchExpressions = ls.matchExpressions.map(normalizeExpression);
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return undefined;
}

function normalizeExpression(expr: MatchExpression): Record<string, unknown> {
  const out: Record<string, unknown> = {
    key: expr.key,
    operator: expr.operator,
  };
  if (expr.operator === 'In' || expr.operator === 'NotIn') {
    out.values = expr.values || [];
  }
  return out;
}

export function buildPolicyGeneratorDocument(req: GenerateRequest, manifestsDir: string): object {
  const labelSelector = buildLabelSelector(req);
  const placement: Record<string, unknown> = {
    name: `placement-${req.policyName}`,
  };
  if (labelSelector) {
    placement.labelSelector = labelSelector;
  }

  // For clusterSets mode, PolicyGenerator generates Placement from labelSelector only.
  // We supply optional matchExpressions as labelSelector and post-process clusterSets.
  if (req.placement.mode === 'clusterSets') {
    const expressions = req.placement.matchExpressions || [];
    if (expressions.length > 0) {
      placement.labelSelector = {
        matchExpressions: expressions.map(normalizeExpression),
      };
    }
  }

  const consolidateManifests = req.consolidateManifests !== false;

  const policyDefaults: Record<string, unknown> = {
    namespace: req.namespace,
    remediationAction: req.remediationAction,
    severity: req.severity,
    complianceType: req.complianceType,
    disabled: req.disabled ?? false,
    pruneObjectBehavior: req.pruneObjectBehavior || 'None',
    standards: req.standards?.length ? req.standards : ['NIST SP 800-53'],
    categories: req.categories?.length ? req.categories : ['CM Configuration Management'],
    controls: req.controls?.length ? req.controls : ['CM-2 Baseline Configuration'],
    consolidateManifests,
    generatePolicyPlacement: true,
    placement,
  };

  if (!consolidateManifests) {
    // Keep ConfigurationPolicy template order aligned with the manifests list.
    policyDefaults.orderManifests = true;
  }

  if (req.description) {
    policyDefaults.description = req.description;
  }

  const manifests = consolidateManifests
    ? (() => {
        // Directory path wraps all files; optional per-manifest complianceType on first entry is unused by PG for dirs.
        // When consolidated, emit one path entry; per-file compliance overrides need per-file paths.
        const hasPerManifestCompliance = req.manifests.some((m) => m.complianceType);
        if (!hasPerManifestCompliance) {
          return [{ path: manifestsDir }];
        }
        return req.manifests.map((manifest, index) => {
          const fileName = sanitizeFileName(manifest.name || `manifest-${index}`, index);
          const entry: Record<string, unknown> = {
            path: path.posix.join(manifestsDir, fileName),
          };
          if (manifest.complianceType) {
            entry.complianceType = manifest.complianceType;
          }
          return entry;
        });
      })()
    : req.manifests.map((manifest, index) => {
        const fileName = sanitizeFileName(manifest.name || `manifest-${index}`, index);
        const entry: Record<string, unknown> = {
          path: path.posix.join(manifestsDir, fileName),
          name: configPolicyNameFromManifest(manifest, index),
        };
        if (manifest.complianceType) {
          entry.complianceType = manifest.complianceType;
        }
        return entry;
      });

  return {
    apiVersion: 'policy.open-cluster-management.io/v1',
    kind: 'PolicyGenerator',
    metadata: {
      name: req.policyName,
    },
    placementBindingDefaults: {
      name: `binding-${req.policyName}`,
    },
    policyDefaults,
    policies: [
      {
        name: req.policyName,
        manifests,
      },
    ],
  };
}

function dumpMultiDoc(docs: unknown[]): string {
  return docs
    .filter((d) => d !== null && d !== undefined)
    .map((doc) => dump(doc, { lineWidth: -1, noRefs: true, sortKeys: false }))
    .join('---\n');
}

export function injectClusterSets(generatedYaml: string, req: GenerateRequest): string {
  if (req.placement.mode !== 'clusterSets' || !req.placement.clusterSets?.length) {
    return generatedYaml;
  }

  const docs = loadAll(generatedYaml) as Record<string, unknown>[];
  const clusterSets = req.placement.clusterSets;
  const namespace = req.namespace;
  const bindings = clusterSets.map((setName) => ({
    apiVersion: 'cluster.open-cluster-management.io/v1beta2',
    kind: 'ManagedClusterSetBinding',
    metadata: {
      name: setName,
      namespace,
    },
    spec: {
      clusterSet: setName,
    },
  }));

  const updated = docs.map((doc) => {
    if (doc?.kind === 'Placement') {
      const placement = { ...doc } as Record<string, unknown>;
      const spec = { ...((placement.spec as Record<string, unknown>) || {}) };
      spec.clusterSets = clusterSets;
      placement.spec = spec;
      return placement;
    }
    return doc;
  });

  return dumpMultiDoc([...bindings, ...updated]);
}

export async function generatePolicyYaml(req: GenerateRequest): Promise<string> {
  if (!req.policyName?.trim()) {
    throw new Error('policyName is required');
  }
  if (!req.namespace?.trim()) {
    throw new Error('namespace is required');
  }
  if (!req.manifests?.length) {
    throw new Error('At least one manifest is required');
  }
  if (req.placement.mode === 'clusterSets' && !req.placement.clusterSets?.length) {
    throw new Error('At least one cluster set is required when using clusterSets mode');
  }

  const workDir = path.join(tmpdir(), `acm-policy-helper-${uuidv4()}`);
  const manifestsDir = path.join(workDir, 'manifests');

  try {
    await fs.mkdir(manifestsDir, { recursive: true });

    for (let i = 0; i < req.manifests.length; i++) {
      const manifest = req.manifests[i];
      const fileName = sanitizeFileName(manifest.name || `manifest-${i}`, i);
      await fs.writeFile(path.join(manifestsDir, fileName), manifest.content, 'utf8');
    }

    const pgDoc = buildPolicyGeneratorDocument(req, 'manifests');
    const pgPath = path.join(workDir, 'policyGenerator.yaml');
    await fs.writeFile(pgPath, dump(pgDoc, { lineWidth: -1, noRefs: true }), 'utf8');

    const { stdout, stderr } = await execFileAsync(POLICY_GENERATOR_BIN, [pgPath], {
      cwd: workDir,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env },
    });

    if (!stdout?.trim()) {
      throw new Error(stderr?.trim() || 'PolicyGenerator produced empty output');
    }

    return injectClusterSets(stdout, req);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
