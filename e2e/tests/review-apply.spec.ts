import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { wizardToReview } from './helpers';

test.describe('Review download, copy, and apply', () => {
  test('downloads YAML with Policy, Placement, and PlacementBinding', async ({ page }) => {
    test.setTimeout(120_000);
    await wizardToReview(page, { name: 'e2e-download-policy' });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download YAML' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('e2e-download-policy.yaml');

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const yaml = readFileSync(filePath!, 'utf8');
    expect(yaml).toContain('kind: Policy');
    expect(yaml).toContain('name: e2e-download-policy');
    expect(yaml).toContain('kind: Placement');
    expect(yaml).toContain('kind: PlacementBinding');
    expect(yaml).toMatch(/environment:\s*dev/);
    expect(yaml).toContain('kind: ConfigMap');
    expect(yaml).toContain('e2e-demo');
  });

  test('copies generated YAML to the clipboard', async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await wizardToReview(page, { name: 'e2e-copy-policy' });

    await page.getByRole('button', { name: 'Copy to clipboard' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible({ timeout: 5_000 });

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('kind: Policy');
    expect(clipboard).toContain('name: e2e-copy-policy');
    expect(clipboard).toContain('kind: PlacementBinding');
  });

  test('applies resources and shows created results', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/apply', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              kind: 'Policy',
              name: 'e2e-apply-policy',
              namespace: 'policies',
              status: 'created',
            },
            {
              kind: 'Placement',
              name: 'e2e-apply-policy-placement',
              namespace: 'policies',
              status: 'created',
            },
            {
              kind: 'PlacementBinding',
              name: 'e2e-apply-policy-binding',
              namespace: 'policies',
              status: 'created',
            },
          ],
        }),
      });
    });

    await wizardToReview(page, { name: 'e2e-apply-policy' });
    await page.getByRole('button', { name: 'Apply to cluster' }).click();

    await expect(page.getByText('Resources applied')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Policy\/e2e-apply-policy.*created/)).toBeVisible();
    await expect(page.getByText(/Placement\/e2e-apply-policy-placement.*created/)).toBeVisible();
  });

  test('shows updated status when apply overwrites existing resources', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/apply', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              kind: 'Policy',
              name: 'e2e-update-policy',
              namespace: 'policies',
              status: 'updated',
            },
            {
              kind: 'Placement',
              name: 'e2e-update-policy-placement',
              namespace: 'policies',
              status: 'updated',
            },
            {
              kind: 'PlacementBinding',
              name: 'e2e-update-policy-binding',
              namespace: 'policies',
              status: 'updated',
            },
          ],
        }),
      });
    });

    await wizardToReview(page, { name: 'e2e-update-policy' });
    await page.getByRole('button', { name: 'Apply to cluster' }).click();

    await expect(page.getByText('Resources applied')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Policy\/e2e-update-policy.*updated/)).toBeVisible();
  });

  test('shows apply failure alert when the API errors', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/apply', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'apply denied by RBAC' }),
      });
    });

    await wizardToReview(page, { name: 'e2e-apply-fail' });
    await page.getByRole('button', { name: 'Apply to cluster' }).click();

    await expect(page.getByText('Apply failed')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('apply denied by RBAC')).toBeVisible();
  });

  test('shows warning when apply completes with partial errors', async ({ page }) => {
    test.setTimeout(120_000);
    await page.route('**/api/apply', async (route) => {
      await route.fulfill({
        status: 207,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              kind: 'Policy',
              name: 'e2e-partial',
              namespace: 'policies',
              status: 'created',
            },
            {
              kind: 'Placement',
              name: 'e2e-partial-placement',
              namespace: 'policies',
              status: 'error',
              message: 'forbidden',
            },
          ],
        }),
      });
    });

    await wizardToReview(page, { name: 'e2e-partial' });
    await page.getByRole('button', { name: 'Apply to cluster' }).click();

    await expect(page.getByText('Apply completed with errors')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Placement\/e2e-partial-placement.*error/)).toBeVisible();
  });
});
