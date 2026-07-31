import { chromium } from 'playwright';
import http, { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { spawn } from 'child_process';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'frontend', 'dist');
const OUT = join(ROOT, 'docs', 'screenshots');
const PG_BIN = join(ROOT, 'e2e', 'bin', 'PolicyGenerator');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const backend = spawn('npx', ['tsx', 'src/server.ts'], {
  cwd: join(ROOT, 'backend'),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: '18080',
    POLICY_GENERATOR_BIN: PG_BIN,
  },
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('backend start timeout')), 15000);
  backend.stdout.on('data', (d) => {
    if (String(d).includes('listening')) {
      clearTimeout(t);
      resolve();
    }
  });
  backend.stderr.on('data', (d) => process.stderr.write(d));
});
console.log('Backend ready');

function proxyApi(req, res) {
  const opts = {
    hostname: '127.0.0.1',
    port: 18080,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:18080' },
  };
  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end(String(err));
  });
  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  if (req.url.startsWith('/api')) return proxyApi(req, res);
  let file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const path = join(DIST, file);
  if (existsSync(path)) {
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(readFileSync(path));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(join(DIST, 'index.html')));
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
console.log(`Serving at ${BASE}`);

const browser = await chromium.launch();
// Tall enough that wizard content + footer buttons stay in frame
const page = await (
  await browser.newContext({ viewport: { width: 1400, height: 1200 } })
).newPage();

async function screenshot(name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, name), fullPage: false });
  console.log(`  captured ${name}`);
}

/** Ensure wizard footer action buttons are fully in the viewport. */
async function ensureFooterVisible() {
  const footer = page.locator(
    '.pf-v6-c-wizard__footer, .pf-v5-c-wizard__footer, [class*="wizard__footer"]'
  ).first();
  if (await footer.count()) {
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  // Prefer scrolling the wizard body so the sticky footer is not clipped
  await page.evaluate(() => {
    const footerEl =
      document.querySelector('.pf-v6-c-wizard__footer') ||
      document.querySelector('.pf-v5-c-wizard__footer') ||
      document.querySelector('[class*="wizard__footer"]');
    if (!footerEl) return;
    footerEl.scrollIntoView({ block: 'end', inline: 'nearest' });
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(200);
}

await page.goto(BASE);
await page.waitForTimeout(1500);

// Shrink YAML editors so Manifests / Review fit with footer buttons
await page.addStyleTag({
  content: `
    .yaml-editor-resizable,
    .monaco-editor,
    .pf-v6-c-code-editor,
    .pf-v5-c-code-editor {
      max-height: 180px !important;
    }
    .yaml-editor-resizable {
      height: 180px !important;
    }
    .pf-v6-c-wizard__main-body,
    .pf-v5-c-wizard__main-body {
      padding-bottom: 0.5rem !important;
    }
  `,
});

// Template: select etcd encryption (filled detail pane)
await page.getByText('etcd encryption', { exact: true }).click();
await page.waitForTimeout(500);
await screenshot('01-template.png');

// Policy settings
await page.getByRole('button', { name: /policy/i }).first().click();
await page.waitForTimeout(1500);

const nsToggle = page.getByPlaceholder('Select namespace');
await nsToggle.click();
await nsToggle.fill('policies');
const policiesOpt = page.getByRole('option', { name: /^policies$/i });
if (await policiesOpt.count() > 0) {
  await policiesOpt.first().click();
} else {
  await page.keyboard.press('Enter');
}
await page.locator('#policy-name').click();
await page.waitForTimeout(300);
await screenshot('02-policy-settings.png');

// Lower half: Prune Object Behavior + Standards / Categories / Controls + footer
await page.getByText('Standards', { exact: true }).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await ensureFooterVisible();
await screenshot('02b-policy-settings-more.png');

// Placement with a matchLabel
await page.getByRole('button', { name: /placement/i }).first().click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /add matchlabel/i }).click();
await page.waitForTimeout(400);

for (const ph of ['Key', 'key', 'Select key', 'Label key']) {
  const el = page.getByPlaceholder(ph, { exact: false });
  if (await el.count() > 0) {
    await el.first().click();
    await el.first().fill('vendor');
    await page.keyboard.press('Enter');
    break;
  }
}
await page.waitForTimeout(200);
for (const ph of ['Value', 'value', 'Select value', 'Label value']) {
  const el = page.getByPlaceholder(ph, { exact: false });
  if (await el.count() > 0) {
    await el.first().click();
    await el.first().fill('OpenShift');
    await page.keyboard.press('Enter');
    break;
  }
}
await page.locator('body').click({ position: { x: 10, y: 10 } });
await ensureFooterVisible();
await screenshot('03-placement.png');

// Manifests (template YAML already present)
await page.getByRole('button', { name: /manifest/i }).first().click();
await page.waitForTimeout(1500);
await ensureFooterVisible();
await screenshot('04-manifests.png');

// Generate → Review
page.on('response', async (res) => {
  if (res.url().includes('/api/generate')) {
    console.log('Generate status:', res.status());
    if (!res.ok()) console.log('Generate body:', await res.text().catch(() => ''));
  }
});

await page.getByRole('button', { name: /^generate$/i }).click();
await page.waitForTimeout(3000);
if (!(await page.getByText(/download|copy|apply/i).count())) {
  await page.getByRole('button', { name: /review/i }).first().click();
  await page.waitForTimeout(500);
  const regen = page.getByRole('button', { name: /regenerate/i });
  if (await regen.count() > 0) {
    await regen.click();
    await page.waitForTimeout(2500);
  }
}
await ensureFooterVisible();
await screenshot('05-review.png');

await browser.close();
server.close();
backend.kill();
console.log('Done.');
