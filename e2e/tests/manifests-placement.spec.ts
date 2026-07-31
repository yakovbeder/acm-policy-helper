import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
  addMatchLabel,
  continueFromTemplateStep,
  fillCreatableTypeahead,
  fillYamlEditor,
  fillPolicySettings,
  fixtureYaml,
  generateAndWaitForReview,
} from './helpers';

async function downloadYaml(page: import('@playwright/test').Page): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download YAML' }).click();
  const download = await downloadPromise;
  return readFileSync((await download.path())!, 'utf8');
}

test.describe('Manifests and placement', () => {
  test('shows YAML lint issues for invalid pasted content', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Manifests' }).click();
    await expect(page.getByRole('tab', { name: 'Paste YAML' })).toBeVisible();
    await fillYamlEditor(page, 'not: valid: yaml: [', 0);
    await expect(page.getByText('YAML lint issues')).toBeVisible({ timeout: 10_000 });
  });

  test('generates policy YAML from a pasted manifest', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-paste-policy' });
    await page.getByRole('button', { name: 'Next' }).click();
    await addMatchLabel(page, 'vendor', 'OpenShift');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('tab', { name: 'Paste YAML' })).toBeVisible();
    const validYaml = [
      'apiVersion: v1',
      'kind: ConfigMap',
      'metadata:',
      '  name: pasted-demo',
      '  namespace: default',
      'data:',
      '  hello: paste',
      '',
    ].join('\n');
    await fillYamlEditor(page, validYaml, 0);
    await expect(page.getByRole('button', { name: 'Add pasted YAML' })).toBeEnabled({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: 'Add pasted YAML' }).click();
    await expect(page.getByText(/Manifests \(1\)/)).toBeVisible({ timeout: 15_000 });

    await generateAndWaitForReview(page);
    const yaml = await downloadYaml(page);
    expect(yaml).toContain('pasted-demo');
  });

  test('adds a matchExpression for placement', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/cluster-labels', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          keys: ['vendor'],
          valuesByKey: { vendor: ['OpenShift', 'Other'] },
        }),
      });
    });

    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-expr-policy' });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Add matchExpression' }).click();
    await fillCreatableTypeahead(page, page.getByPlaceholder('Select label key'), 'vendor');

    const valuesBox = page.getByPlaceholder('Select values');
    await valuesBox.click();
    await page.getByRole('option', { name: 'OpenShift' }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('tab', { name: 'Upload file' }).click();
    await page
      .getByRole('tabpanel', { name: 'Upload file' })
      .locator('input[type="file"]')
      .setInputFiles(fixtureYaml);
    await expect(page.getByText(/Manifests \(1\)/)).toBeVisible({ timeout: 15_000 });
    await generateAndWaitForReview(page);

    const yaml = await downloadYaml(page);
    expect(yaml).toContain('matchExpressions');
    expect(yaml).toContain('vendor');
    expect(yaml).toContain('OpenShift');
  });

  test('targets ManagedClusterSets when catalog options are available', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/cluster-sets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clusterSets: ['default', 'global'] }),
      });
    });
    await page.route('**/api/cluster-labels', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          keys: ['vendor'],
          valuesByKey: { vendor: ['OpenShift'] },
        }),
      });
    });

    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-mcs-policy' });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await page.locator('#mode-clustersets').check({ force: true });
    await expect(page.getByText('Cluster sets')).toBeVisible();

    const mcsInput = page.getByPlaceholder('Select ManagedClusterSets');
    await mcsInput.click();
    await page.getByRole('option', { name: 'default' }).click();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('tab', { name: 'Upload file' }).click();
    await page
      .getByRole('tabpanel', { name: 'Upload file' })
      .locator('input[type="file"]')
      .setInputFiles(fixtureYaml);
    await expect(page.getByText(/Manifests \(1\)/)).toBeVisible({ timeout: 15_000 });
    await generateAndWaitForReview(page);

    const yaml = await downloadYaml(page);
    expect(yaml).toContain('clusterSets');
    expect(yaml).toContain('default');
    expect(yaml).toContain('ManagedClusterSetBinding');
  });
});
