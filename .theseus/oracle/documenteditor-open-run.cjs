'use strict';
// Runner for documenteditor-open.sh (PKT-0048). Exit 0 = PASS, 1 = FAIL.
const fs = require('fs');
const {execFileSync} = require('child_process');
const {chromium} = require('playwright');

const BASE = process.argv[2] || 'http://localhost';
const STORE = process.env.EXAMPLE_STORE || '/var/lib/euro-office/documentserver-example/files/127.0.0.1/';
const MARKER = 'THESEUSORACLE' + Date.now();
const T = 90000;

async function main() {
  const t0 = Date.now();
  const times = {};
  const mark = k => (times[k] = Date.now() - t0);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(BASE + '/example/editor?fileExt=docx');
    const name = new URL(page.url()).searchParams.get('fileName');
    if (!name) throw new Error('example did not create a docx: ' + page.url());
    const file = STORE + name;
    const editor = page.frameLocator('iframe[name="frameEditor"]');
    await editor.locator('#toolbar').first().waitFor({timeout: T});
    mark('toolbar');
    await editor.locator('.asc-loadmask').waitFor({state: 'detached', timeout: T});
    mark('loaded');
    await editor.locator('#id_viewer_overlay').click({position: {x: 300, y: 100}});
    await page.keyboard.type(MARKER);
    await page.waitForTimeout(2000);
    mark('typed');
    const before = fs.statSync(file).mtimeMs;
    await page.close();
    const deadline = Date.now() + T;
    while (fs.statSync(file).mtimeMs === before) {
      if (Date.now() > deadline) throw new Error('no save callback (status 2) for ' + name);
      await new Promise(r => setTimeout(r, 500));
    }
    mark('saved');
    const xml = execFileSync('unzip', ['-p', file, 'word/document.xml']).toString();
    if (!xml.includes(MARKER)) throw new Error('saved ' + name + ' does not contain the typed marker');
    console.log('PASS documenteditor-open', name, JSON.stringify(times), 'total_ms=' + (Date.now() - t0));
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.log('FAIL documenteditor-open', e.message);
  process.exit(1);
});
