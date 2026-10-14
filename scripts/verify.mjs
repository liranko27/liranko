import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { business, contactUrl } = await import('data:text/javascript;base64,' + Buffer.from(compile('src/data/business.ts')).toString('base64'));
const configuredPhone = business.phone;
const configuredPhoneUrl = contactUrl('phone');
const configuredWhatsappUrl = contactUrl('whatsapp');
const originalPhone = business.phone;
const originalWhatsapp = business.whatsapp;

try {
  business.phone = '';
  business.whatsapp = '';
  assert.equal(contactUrl('phone'), undefined);
  assert.equal(contactUrl('whatsapp'), undefined);

  business.phone = '+972501234567';
  business.whatsapp = '+972501234567';
  assert.equal(contactUrl('phone'), 'tel:0501234567');

  const whatsapp = new URL(contactUrl('whatsapp', 'תאורה ומאווררים'));
  assert.equal(whatsapp.hostname, 'wa.me');
  assert.equal(whatsapp.pathname, '/972501234567');
  assert.match(whatsapp.searchParams.get('text'), /עבודת חשמל|דרך האתר/);

  business.phone = 'PLACEHOLDER';
  assert.equal(contactUrl('phone'), undefined);
} finally {
  business.phone = originalPhone;
  business.whatsapp = originalWhatsapp;
}
const html = fs.readFileSync('dist/index.html', 'utf8');
const expectedTitle = 'חשמלאי מוסמך במרכז ובשרון | לירן קוזוקרו – LIRANKO';
const expectedDescription = 'לירן קוזוקרו, חשמלאי מוסמך ומתקין Shelly מורשה. שירות בתל אביב, ראש העין, המרכז והשרון: תיקוני חשמל, תאורה, שקעים, לוחות חשמל ופתרונות לבית חכם. לתיאום צרו קשר.';
assert.deepEqual([...html.matchAll(/<title>(.*?)<\/title>/gs)].map(match => match[1]), [expectedTitle]);
for (const [attribute, key, expected] of [
  ['name', 'description', expectedDescription],
  ['property', 'og:title', expectedTitle],
  ['property', 'og:description', expectedDescription],
  ['name', 'twitter:title', expectedTitle],
  ['name', 'twitter:description', expectedDescription],
]) {
  const tags = [...html.matchAll(/<meta\b[^>]*>/g)].map(match => match[0]).filter(tag => tag.includes(`${attribute}="${key}"`));
  assert.equal(tags.length, 1, `Expected one ${key} tag`);
  assert.ok(tags[0].includes(`content="${expected}"`), `Incorrect ${key}`);
}
assert.match(html, /lang="he"/); assert.match(html, /dir="rtl"/);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
for (const [, hash] of html.matchAll(/href="#([^"\s]+)"/g)) assert.ok(html.includes(`id="${hash}"`), `Missing anchor ${hash}`);
if (configuredPhoneUrl) {
  assert.ok(html.includes(`href="${configuredPhoneUrl}"`));
  assert.ok(html.includes(`https://wa.me/${configuredPhone.slice(1)}?text=`));
  assert.equal(new URL(configuredWhatsappUrl).pathname, `/${configuredPhone.slice(1)}`);
} else {
  assert.ok(!/href="(?:tel:|https:\/\/wa.me\/)/.test(html));
}
assert.match(html, /rel="canonical"/);
assert.doesNotMatch(html, /meta name="robots" content="noindex, nofollow"/i);
const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(jsonLd['@type'], 'Electrician'); assert.ok(!jsonLd.aggregateRating); assert.ok(!jsonLd.address);
assert.equal(jsonLd.description, expectedDescription);
assert.deepEqual(jsonLd.areaServed, ['אזור המרכז', 'השרון', 'תל אביב', 'ראש העין']);
for (const [, asset] of html.matchAll(/(?:src|href)="(\/_astro\/[^"\s]+)"/g)) assert.ok(fs.existsSync('dist' + asset));
const listeners = new Map();
const element = key => ({ dataset: {}, hidden: true, addEventListener: (event, fn) => listeners.set(`${key}:${event}`, fn), querySelector: () => ({ focus() {} }) });
const banner = element('banner'); const settings = element('settings');
const accept = element('accept'); accept.dataset.consent = 'granted';
const reject = element('reject'); reject.dataset.consent = 'denied';
const hero = element('hero'); hero.dataset = { contact: 'whatsapp', location: 'hero' };
const service = element('service'); service.dataset = { contact: 'phone', location: 'services', service: 'לוחות חשמל' };
const appended = [];
const context = { window: { dataLayer: [], location: { href: 'https://liranko.co.il/', pathname: '/' } }, document: { body: { dataset: { gtm: 'GTM-TEST123' } }, head: { append: s => appended.push(s) }, createElement: () => ({}), querySelector: s => s === '#consent-banner' ? banner : settings, querySelectorAll: s => s === '[data-consent]' ? [accept, reject] : [hero, service] }, localStorage: { getItem: () => null, setItem() {} }, Date, encodeURIComponent };
vm.runInNewContext(compile('src/scripts/tracking.ts').replace('export {};', ''), context);
assert.equal(appended.length, 0); listeners.get('hero:click')(); assert.equal(context.window.dataLayer.length, 2);
listeners.get('reject:click')(); assert.equal(appended.length, 0);
listeners.get('accept:click')(); assert.equal(appended.length, 1);
listeners.get('hero:click')(); listeners.get('service:click')();
const events = context.window.dataLayer.filter(x => x.event && x.event !== 'gtm.js');
assert.equal(events.map(x => x.event).join(','), 'whatsapp_click,hero_cta_click,phone_click,service_cta_click');
assert.equal(events[3].selected_service, 'לוחות חשמל');
listeners.get('reject:click')(); const count = context.window.dataLayer.length; listeners.get('hero:click')(); assert.equal(context.window.dataLayer.length, count);
console.log('QA passed: RTL/SEO, anchors/assets, disabled contacts, configured contact URLs, Hebrew encoding, JSON-LD, consent gating, event metadata and revocation.');
