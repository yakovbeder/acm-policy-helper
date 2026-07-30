import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureYaml = path.join(__dirname, 'fixtures', 'configmap.yaml');
const secretFixtureYaml = path.join(__dirname, 'fixtures', 'secret.yaml');

/** Fill a PF6 TypeaheadSelect (role=combobox) that may already have a value. */
async function fillCreatableTypeahead(page: Page, combobox: Locator, value: string) {
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

test.describe('ACM Policy Helper wizard', () => {
  test('loads the UI and shows wizard steps', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'ACM Policy Helper' })).toBeVisible();
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

  test('generates policy yaml through the wizard', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');

    await page.locator('#policy-name').fill('e2e-config-policy');

    // Wait for NamespaceSelect to finish loading, then set namespace via typeahead.
    await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });
    const namespaceInput = page.getByRole('combobox').first();
    await fillCreatableTypeahead(page, namespaceInput, 'policies');
    await page.getByRole('button', { name: 'Next' }).click();

    // Placement step — wait for cluster catalog loading to finish
    await expect(page.getByText(/Loading ManagedClusterSets/)).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Add matchLabel' }).click();

    const labelKey = page.getByPlaceholder('Select label key');
    const labelValue = page.getByPlaceholder('Select label value');
    await fillCreatableTypeahead(page, labelKey, 'environment');
    await fillCreatableTypeahead(page, labelValue, 'dev');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('tab', { name: 'Paste YAML' })).toBeVisible();
    await page.getByRole('tab', { name: 'Upload file' }).click();
    await page
      .getByRole('tabpanel', { name: 'Upload file' })
      .locator('input[type="file"]')
      .setInputFiles(fixtureYaml);

    await expect(page.getByText(/Manifests \([1-9]/)).toBeVisible({ timeout: 15_000 });

    const generateBtn = page.getByRole('button', { name: 'Generate' });
    await expect(generateBtn).toBeEnabled({ timeout: 10_000 });
    await generateBtn.click();

    await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toBeVisible();
  });

  test('generates separate ConfigurationPolicies per manifest', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');

    await page.locator('#policy-name').fill('e2e-multi-cp-policy');
    await expect(page.getByText('Loading namespaces…')).toBeHidden({ timeout: 15_000 });

    // Enable separate ConfigurationPolicy mode (force avoids PF switch toggle intercept)
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

    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByRole('button', { name: 'Download YAML' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('button', { name: 'Apply to cluster' })).toBeVisible();
  });
});
