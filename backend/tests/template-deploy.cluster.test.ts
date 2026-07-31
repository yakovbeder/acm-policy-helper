/**
 * Cluster integration: generate ACM policies from every built-in template and apply them.
 *
 * Requires a logged-in kubeconfig (e.g. `ocp4`) and the PolicyGenerator binary.
 *
 *   RUN_CLUSTER_TESTS=1 npm run test:cluster
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyYaml } from '../src/services/kubeClient.js';
import { generatePolicyYaml } from '../src/services/policyGenerator.js';
import type { GenerateRequest } from '../src/types.js';
import {
  formFromTemplate,
  policyTemplates,
} from '../../frontend/src/templates/index.ts';

const runCluster = process.env.RUN_CLUSTER_TESTS === '1' || process.env.RUN_CLUSTER_TESTS === 'true';
const describeCluster = runCluster ? describe : describe.skip;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_NS = process.env.TEMPLATE_DEPLOY_NAMESPACE || 'acm-policy-helper-e2e';
const NAME_PREFIX = 'aph-tpl-';

function oc(...args: string[]): string {
  return execFileSync('oc', args, { encoding: 'utf8' }).trim();
}

function toGenerateRequest(
  templateId: string,
  form: ReturnType<typeof formFromTemplate>
): GenerateRequest {
  const policyName = `${NAME_PREFIX}${templateId}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return {
    policyName,
    namespace: TEST_NS,
    remediationAction: 'inform',
    severity: form.severity,
    complianceType: form.complianceType,
    description: form.description || `E2E template deploy: ${templateId}`,
    disabled: true,
    pruneObjectBehavior: 'None',
    standards: form.standards,
    categories: form.categories,
    controls: form.controls,
    consolidateManifests: form.consolidateManifests,
    placement: {
      mode: 'labelSelector',
      labelSelector: {
        matchLabels: { 'local-cluster': 'true' },
        matchExpressions: [],
      },
      clusterSets: [],
      matchExpressions: [],
    },
    manifests: form.manifests.map((m) => ({
      name: m.name,
      content: m.content,
      configPolicyName: m.configPolicyName,
      complianceType: m.complianceType,
    })),
  };
}

describeCluster('template policy deploy (cluster)', () => {
  const createdPolicies: string[] = [];

  beforeAll(() => {
    process.env.POLICY_GENERATOR_BIN =
      process.env.POLICY_GENERATOR_BIN || path.join(ROOT, 'e2e/bin/PolicyGenerator');
    delete process.env.KUBERNETES_SERVICE_HOST;
    delete process.env.KUBERNETES_SERVICE_PORT;

    oc('whoami');
    try {
      oc('get', 'ns', TEST_NS);
    } catch {
      oc('create', 'ns', TEST_NS);
    }
  }, 60_000);

  afterAll(() => {
    for (const name of createdPolicies) {
      try {
        oc(
          'delete',
          'policies.policy.open-cluster-management.io',
          name,
          '-n',
          TEST_NS,
          '--ignore-not-found=true',
          '--wait=false'
        );
      } catch {
        /* best-effort cleanup */
      }
      try {
        oc(
          'delete',
          'placements.cluster.open-cluster-management.io',
          `placement-${name}`,
          '-n',
          TEST_NS,
          '--ignore-not-found=true',
          '--wait=false'
        );
      } catch {
        /* best-effort cleanup */
      }
      try {
        oc(
          'delete',
          'placementbindings.policy.open-cluster-management.io',
          `binding-${name}`,
          '-n',
          TEST_NS,
          '--ignore-not-found=true',
          '--wait=false'
        );
      } catch {
        /* best-effort cleanup */
      }
    }
  }, 120_000);

  it('has at least one built-in template', () => {
    expect(policyTemplates.length).toBeGreaterThan(0);
  });

  for (const template of policyTemplates) {
    it(
      `generates and applies template ${template.id}`,
      async () => {
        const form = formFromTemplate(template);
        const req = toGenerateRequest(template.id, form);
        expect(req.manifests.length).toBeGreaterThan(0);

        const yamlOut = await generatePolicyYaml(req);
        expect(yamlOut).toContain('kind: Policy');
        expect(yamlOut).toContain(`name: ${req.policyName}`);

        const results = await applyYaml(yamlOut);
        const failed = results.filter((r) => r.status === 'error');
        expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);

        createdPolicies.push(req.policyName);

        const policyYaml = oc(
          'get',
          'policies.policy.open-cluster-management.io',
          req.policyName,
          '-n',
          TEST_NS,
          '-o',
          'yaml'
        );
        expect(policyYaml).toContain(`name: ${req.policyName}`);
        expect(policyYaml).toMatch(/disabled:\s*true/);

        oc(
          'get',
          'placements.cluster.open-cluster-management.io',
          `placement-${req.policyName}`,
          '-n',
          TEST_NS
        );
        oc(
          'get',
          'placementbindings.policy.open-cluster-management.io',
          `binding-${req.policyName}`,
          '-n',
          TEST_NS
        );
      },
      120_000
    );
  }
});
