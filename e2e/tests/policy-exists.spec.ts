import { expect, test } from '@playwright/test';
import {
  continueFromTemplateStep,
  fillPolicySettings,
  samplePolicyBundle,
} from './helpers';

test.describe('Policy already exists', () => {
  const name = 'e2e-existing-policy';
  const namespace = 'policies';

  async function stubExistingPolicy(page: import('@playwright/test').Page) {
    const bundle = samplePolicyBundle(name, namespace);
    await page.route(`**/api/policies/${namespace}/${name}`, async (route) => {
      if (route.request().url().includes('/bundle')) {
        return route.continue();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ policy: bundle.policy }),
      });
    });
    await page.route(`**/api/policies/${namespace}/${name}/bundle`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(bundle),
      });
    });
  }

  test('Cancel keeps the user on Policy settings', async ({ page }) => {
    await stubExistingPolicy(page);
    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name, namespace });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Policy exists' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Policy exists' })).toBeHidden();
    await expect(page.locator('#policy-name')).toBeVisible();
    await expect(page.getByText('Cluster label selectors')).toHaveCount(0);
  });

  test('Continue as new proceeds without hydrating hub manifests', async ({ page }) => {
    await stubExistingPolicy(page);
    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name, namespace });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Policy exists' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Continue as new' }).click();
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(`Editing existing policy ${name} in ${namespace}`)
    ).toHaveCount(0);
  });

  test('Fetch and edit hydrates the hub policy into the wizard', async ({ page }) => {
    test.setTimeout(120_000);
    await stubExistingPolicy(page);
    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name, namespace });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Policy exists' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Fetch and edit' }).click();

    await expect(
      page.getByText(`Editing existing policy ${name} in ${namespace}`)
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Cluster label selectors')).toBeVisible();

    // Placement from hub bundle (typeahead values)
    const labelComboboxes = page.getByRole('combobox', { name: 'Type to filter' });
    await expect(labelComboboxes.nth(0)).toHaveValue('vendor', { timeout: 10_000 });
    await expect(labelComboboxes.nth(1)).toHaveValue('OpenShift');

    await page.getByRole('button', { name: 'Manifests' }).click();
    await expect(page.getByText(/Manifests \([1-9]/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('button', { name: 'Update on cluster' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toHaveCount(0);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download YAML' }).click();
    const download = await downloadPromise;
    const { readFileSync } = await import('node:fs');
    const yaml = readFileSync((await download.path())!, 'utf8');
    expect(yaml).toContain('hub-existing');
    expect(yaml).toContain('name: e2e-existing-policy');
  });
});
