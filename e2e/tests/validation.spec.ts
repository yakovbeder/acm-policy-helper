import { expect, test } from '@playwright/test';
import {
  continueFromTemplateStep,
  fillPolicySettings,
  fixtureYaml,
  uploadManifest,
  wizardToReview,
} from './helpers';

test.describe('Wizard validation and error paths', () => {
  test('clears Review YAML when settings or manifests change', async ({ page }) => {
    test.setTimeout(90_000);
    await wizardToReview(page, { name: 'e2e-stale-yaml' });
    await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible();

    // Changing settings invalidates the preview
    await page.getByRole('button', { name: 'Policy settings' }).click();
    await page.locator('#policy-name').fill('e2e-stale-yaml-renamed');
    await page.getByRole('button', { name: 'Review & apply' }).click();
    await expect(page.getByText('No generated YAML yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download YAML' })).toHaveCount(0);

    // Generate again, then removing manifests clears again
    await page.getByRole('button', { name: 'Manifests' }).click();
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole('button', { name: 'Manifests' }).click();
    await page.getByRole('button', { name: /Remove / }).click();
    await expect(page.getByText('No manifests added yet')).toBeVisible();
    await page.getByRole('button', { name: 'Review & apply' }).click();
    await expect(page.getByText('No generated YAML yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download YAML' })).toHaveCount(0);
  });

  test('disables Generate when there are no manifests', async ({ page }) => {
    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-no-manifests' });
    await page.getByRole('button', { name: 'Manifests' }).click();
    await expect(page.getByText('No manifests added yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled();
  });

  test('blocks generate when policy name and namespace are missing', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Manifests' }).click();
    await uploadManifest(page, fixtureYaml);
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(
      page.getByText('Policy name and namespace are required before generating.')
    ).toBeVisible();
  });

  test('blocks generate in ManagedClusterSets mode with no sets selected', async ({ page }) => {
    await page.route('**/api/cluster-sets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clusterSets: ['default'] }),
      });
    });

    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-empty-mcs' });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await page.locator('#mode-clustersets').check({ force: true });
    await page.getByRole('button', { name: 'Manifests' }).click();
    await uploadManifest(page, fixtureYaml);
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(
      page.getByText('Add at least one ManagedClusterSet, or switch to label selectors.')
    ).toBeVisible();
  });

  test('shows generation failure when PolicyGenerator API errors', async ({ page }) => {
    test.setTimeout(60_000);
    await page.route('**/api/generate', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'PolicyGenerator failed: simulated error' }),
      });
    });

    await page.goto('/');
    await continueFromTemplateStep(page);
    await fillPolicySettings(page, { name: 'e2e-gen-fail' });
    await page.getByRole('button', { name: 'Manifests' }).click();
    await uploadManifest(page, fixtureYaml);
    await page.getByRole('button', { name: 'Generate' }).click();

    await expect(
      page.locator('.pf-v6-c-alert__description').filter({
        hasText: 'PolicyGenerator failed: simulated error',
      })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Download YAML' })).toHaveCount(0);
  });
});
