import { expect, test } from '@playwright/test';
import {
  continueFromTemplateStep,
  fillCreatableTypeahead,
  fixtureYaml,
  generateAndWaitForReview,
  secretFixtureYaml,
} from './helpers';

test.describe('ACM Policy Helper wizard', () => {
  test('loads the UI and shows wizard steps', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ACM Policy Helper' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Template' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a template' })).toBeVisible();
    await continueFromTemplateStep(page);
    await expect(page.getByRole('button', { name: 'Policy settings' })).toBeVisible();
    await expect(page.locator('#policy-name')).toBeVisible();
  });

  test('toggles dark mode', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/pf-v6-theme-dark/);
  });

  test('allows navigating to any wizard step without filling required fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Choose a template' })).toBeVisible();
    await page.getByRole('button', { name: 'Placement' }).click();
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Manifests' }).click();
    await expect(page.getByRole('tab', { name: 'Paste YAML' })).toBeVisible();
    await page.getByRole('button', { name: 'Policy settings' }).click();
    await expect(page.locator('#policy-name')).toBeVisible();
  });

  test('selects a built-in template and pre-fills settings', async ({ page }) => {
    await page.goto('/');
    await page.locator('#template-cc-remove-kubeadmin').click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#policy-name')).toHaveValue('remove-kubeadmin');
    await expect(page.locator('#compliance-type')).toBeVisible();
  });

  test('filters templates by search and category', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search templates').fill('IDMS');
    await expect(page.locator('#template-cc-idms')).toBeVisible();
    await expect(page.locator('#template-cc-remove-kubeadmin')).toHaveCount(0);

    await page.getByLabel('Search templates').fill('');
    await page.locator('#template-category-cluster-health').click();
    await expect(page.locator('[id^="template-ch-"]').first()).toBeVisible();
    await expect(page.locator('#template-cc-idms')).toHaveCount(0);
  });

  test('generates policy yaml from a built-in template', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await page.locator('#template-cc-cluster-banner').click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#policy-name')).toHaveValue('cluster-banner');

    await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });
    await fillCreatableTypeahead(page, page.getByRole('combobox').first(), 'policies');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Add matchLabel' }).click();
    await fillCreatableTypeahead(page, page.getByPlaceholder('Select label key'), 'local-cluster');
    await fillCreatableTypeahead(page, page.getByPlaceholder('Select label value'), 'true');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Manifests \([1-9]/)).toBeVisible({ timeout: 15_000 });
    await generateAndWaitForReview(page);
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toBeVisible();
  });

  test('disables global compliance type when separate ConfigurationPolicies are on', async ({
    page,
  }) => {
    await page.goto('/');
    await continueFromTemplateStep(page);
    await page.locator('#consolidate').check({ force: true });
    await expect(page.locator('#consolidate')).toBeChecked();
    await expect(page.locator('#compliance-type')).toBeDisabled();
  });

  test('generates policy yaml through the wizard', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await continueFromTemplateStep(page);

    await page.locator('#policy-name').fill('e2e-config-policy');
    await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });
    await fillCreatableTypeahead(page, page.getByRole('combobox').first(), 'policies');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Add matchLabel' }).click();
    await fillCreatableTypeahead(page, page.getByPlaceholder('Select label key'), 'environment');
    await fillCreatableTypeahead(page, page.getByPlaceholder('Select label value'), 'dev');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('tab', { name: 'Upload file' }).click();
    await page
      .getByRole('tabpanel', { name: 'Upload file' })
      .locator('input[type="file"]')
      .setInputFiles(fixtureYaml);

    await expect(page.getByText(/Manifests \([1-9]/)).toBeVisible({ timeout: 15_000 });
    await generateAndWaitForReview(page);
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toBeVisible();
  });

  test('generates separate ConfigurationPolicies per manifest', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    await continueFromTemplateStep(page);

    await page.locator('#policy-name').fill('e2e-multi-cp-policy');
    await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });
    await page.locator('#consolidate').check({ force: true });
    await expect(page.locator('#consolidate')).toBeChecked();

    await fillCreatableTypeahead(page, page.getByRole('combobox').first(), 'policies');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('tab', { name: 'Upload file' }).click();
    const uploadPanel = page.getByRole('tabpanel', { name: 'Upload file' });
    const fileInput = uploadPanel.locator('input[type="file"]');
    await fileInput.setInputFiles(fixtureYaml);
    await expect(page.getByText(/Manifests \(1\)/)).toBeVisible({ timeout: 15_000 });
    await uploadPanel.getByRole('button', { name: 'Clear' }).click();
    await fileInput.setInputFiles(secretFixtureYaml);
    await expect(page.getByText(/Manifests \(2\)/)).toBeVisible({ timeout: 15_000 });

    await expect(page.getByLabel('ConfigurationPolicy name').first()).toBeVisible();

    await generateAndWaitForReview(page);
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toBeVisible();
  });
});
