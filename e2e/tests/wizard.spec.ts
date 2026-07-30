import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureYaml = path.join(__dirname, 'fixtures', 'configmap.yaml');

async function fillTypeahead(page: Page, parentId: string, value: string) {
  const input = page.locator(`#${parentId} input[type="text"]`);
  await input.click();
  await input.fill(value);
  const createOption = page.getByRole('option', { name: new RegExp(`"${value}"`) });
  if (await createOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createOption.click();
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

    // Namespace is a TypeaheadSelect — wait for loading to finish, then type
    await expect(page.locator('#namespace')).toBeVisible({ timeout: 15_000 });
    await fillTypeahead(page, 'namespace', 'policies');
    await page.getByRole('button', { name: 'Next' }).click();

    // Placement step — wait for cluster catalog loading
    await expect(page.getByText('Cluster label selectors')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Add matchLabel' }).click();
    await fillTypeahead(page, 'label-key-0', 'environment');
    await fillTypeahead(page, 'label-value-0', 'dev');
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
});

