import { expect, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const fixtureYaml = path.join(__dirname, 'fixtures', 'configmap.yaml');
export const secretFixtureYaml = path.join(__dirname, 'fixtures', 'secret.yaml');

/** Fill a PF6 TypeaheadSelect (role=combobox) that may already have a value. */
export async function fillCreatableTypeahead(page: Page, combobox: Locator, value: string) {
  await expect(combobox).toBeVisible({ timeout: 15_000 });
  await combobox.click();
  await combobox.fill(value);
  const createOption = page.getByRole('option', { name: new RegExp(`"${value}"`) });
  if (await createOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createOption.click();
  } else {
    await combobox.press('Enter');
  }
}

export async function continueFromTemplateStep(page: Page) {
  await expect(page.getByRole('heading', { name: 'Choose a template' })).toBeVisible();
  await expect(page.locator('#template-blank')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('#policy-name')).toBeVisible({ timeout: 15_000 });
}

export async function fillPolicySettings(
  page: Page,
  opts: { name: string; namespace?: string }
) {
  await page.locator('#policy-name').fill(opts.name);
  await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });
  await fillCreatableTypeahead(
    page,
    page.getByRole('combobox').first(),
    opts.namespace ?? 'policies'
  );
  await page.keyboard.press('Escape');
}

export async function addMatchLabel(page: Page, key: string, value: string) {
  await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add matchLabel' }).click();
  await fillCreatableTypeahead(page, page.getByPlaceholder('Select label key'), key);
  await fillCreatableTypeahead(page, page.getByPlaceholder('Select label value'), value);
}

export async function uploadManifest(page: Page, filePath: string) {
  await expect(page.getByRole('tab', { name: 'Paste YAML' })).toBeVisible();
  await page.getByRole('tab', { name: 'Upload file' }).click();
  await page
    .getByRole('tabpanel', { name: 'Upload file' })
    .locator('input[type="file"]')
    .setInputFiles(filePath);
  await expect(page.getByText(/Manifests \([1-9]/)).toBeVisible({ timeout: 15_000 });
}

/**
 * Set YAML in a PatternFly/Monaco CodeEditor via clipboard paste (most reliable).
 */
export async function fillYamlEditor(page: Page, text: string, index = 0) {
  await expect(page.getByRole('textbox', { name: 'Editor content' }).nth(index)).toBeAttached({
    timeout: 15_000,
  });
  const surface = page.locator('.monaco-editor').nth(index);
  await expect(surface).toBeVisible({ timeout: 15_000 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(async (value) => {
    await navigator.clipboard.writeText(value);
  }, text);
  await surface.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  // Wait for React onChange to settle
  await page.waitForTimeout(300);
}

export async function generateAndWaitForReview(page: Page) {
  const generateBtn = page.getByRole('button', { name: 'Generate' });
  await expect(generateBtn).toBeEnabled({ timeout: 10_000 });
  await generateBtn.click();
  await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible({
    timeout: 60_000,
  });
}

/** Walk blank template → settings → placement (matchLabel) → upload → review. */
export async function wizardToReview(
  page: Page,
  opts: {
    name: string;
    namespace?: string;
    labelKey?: string;
    labelValue?: string;
    fixture?: string;
  }
) {
  await page.goto('/');
  await continueFromTemplateStep(page);
  await fillPolicySettings(page, { name: opts.name, namespace: opts.namespace });
  await page.getByRole('button', { name: 'Next' }).click();
  await addMatchLabel(
    page,
    opts.labelKey ?? 'environment',
    opts.labelValue ?? 'dev'
  );
  await page.getByRole('button', { name: 'Next' }).click();
  await uploadManifest(page, opts.fixture ?? fixtureYaml);
  await generateAndWaitForReview(page);
}

export function samplePolicyBundle(name: string, namespace: string) {
  return {
    policy: {
      apiVersion: 'policy.open-cluster-management.io/v1',
      kind: 'Policy',
      metadata: {
        name,
        namespace,
        annotations: {
          'policy.open-cluster-management.io/description': 'Existing hub policy',
          'policy.open-cluster-management.io/standards': 'NIST SP 800-53',
        },
        resourceVersion: '42',
      },
      spec: {
        disabled: false,
        remediationAction: 'inform',
        'policy-templates': [
          {
            objectDefinition: {
              apiVersion: 'policy.open-cluster-management.io/v1',
              kind: 'ConfigurationPolicy',
              metadata: { name },
              spec: {
                remediationAction: 'inform',
                severity: 'low',
                pruneObjectBehavior: 'None',
                'object-templates': [
                  {
                    complianceType: 'musthave',
                    objectDefinition: {
                      apiVersion: 'v1',
                      kind: 'ConfigMap',
                      metadata: { name: 'hub-existing', namespace: 'default' },
                      data: { from: 'hub' },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
    placement: {
      apiVersion: 'cluster.open-cluster-management.io/v1beta1',
      kind: 'Placement',
      metadata: { name: `${name}-placement`, namespace },
      spec: {
        predicates: [
          {
            requiredClusterSelector: {
              labelSelector: {
                matchLabels: { vendor: 'OpenShift' },
              },
            },
          },
        ],
      },
    },
    placementBinding: {
      apiVersion: 'policy.open-cluster-management.io/v1',
      kind: 'PlacementBinding',
      metadata: { name: `${name}-binding`, namespace },
    },
  };
}
