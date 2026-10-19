import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const expectedTitle = 'לירן קוזוקרו — חשמלאי מוסמך באזור המרכז | LIRANKO';
const expectedDescription = 'לירן קוזוקרו — חשמלאי מוסמך, רישיון 996726 ומתקין Shelly מורשה. שירותי חשמל לבית ולעסק באזור המרכז: תקלות, לוחות חשמל, תאורה ובית חכם. התקשרו 058-6567657.';
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
assert.deepEqual(jsonLd.areaServed, ['אזור המרכז']);
for (const [, asset] of html.matchAll(/(?:src|href)="(\/_astro\/[^"\s]+)"/g)) assert.ok(fs.existsSync('dist' + decodeURIComponent(asset)), `Missing asset ${asset}`);
await import('./check-tracking.mjs');

for (const path of ['dist/index.html', 'dist/portfolio/index.html', 'dist/accessibility-draft/index.html']) {
  const page = fs.readFileSync(path, 'utf8');
  assert.equal((page.match(/<h1\b/g) || []).length, 1, `${path}: one main heading`);
  assert.match(page, /href="#main"/);
  assert.match(page, /id="main"/);
  assert.doesNotMatch(page, /ראש העין|השרון|24\/7|הגעה מיידית|ייעוץ חינם/);
  for (const [, href] of page.matchAll(/href="((?:tel:|https:\/\/wa.me\/)[^"]+)"/g)) {
    if (href.startsWith('tel:')) assert.equal(href, 'tel:0586567657');
    else assert.equal(new URL(href.replaceAll('&amp;', '&')).pathname, '/972586567657');
  }
  for (const [tag] of page.matchAll(/<img\b[^>]*>/g)) {
    if (!tag.includes('class="dialog-image"')) assert.match(tag, /alt="[^"]+"/, `${path}: meaningful image description`);
  }
  assert.doesNotMatch(page, /<script[^>]+src="https:\/\/www.googletagmanager.com/);
}
assert.equal((html.match(/<button\b[^>]*data-project-card/g) || []).length, 6);
assert.equal((fs.readFileSync('dist/portfolio/index.html', 'utf8').match(/<button\b[^>]*data-project-card/g) || []).length, 12);
assert.match(html, /fetchpriority="high"/);
for (const [phoneLink] of html.matchAll(/<a\b[^>]*href="tel:0586567657"[^>]*>.*?<\/a>/gs)) {
  assert.match(phoneLink, /aria-label="חייגו אליי: 058-6567657"/);
  assert.match(phoneLink, /class="phone-label">חייגו אליי<\/span>/);
  assert.match(phoneLink, /<bdi class="phone-number" dir="ltr">058-6567657<\/bdi>/);
}
assert.match(html, /loading="eager"/);
assert.match(html, /<dialog\b/);
assert.equal(jsonLd.identifier.value, '996726');
assert.match(fs.readFileSync('dist/accessibility-draft/index.html', 'utf8'), /noindex, nofollow/);
const css = fs.readFileSync('src/styles/global.css', 'utf8');
assert.match(css, /safe-area-inset-bottom/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /:focus-visible/);
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const [text, background] of [['b3c0d1','142238'], ['54bcff','101b2b'], ['d2dce9','0d1624'], ['031725','39adf7'], ['f2f8ff','142338']]) {
  const values = [luminance(text), luminance(background)].sort((a,b) => b-a);
  assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, `Insufficient text contrast ${text}/${background}`);
}
console.log('QA passed: RTL/SEO, anchors/assets, disabled contacts, configured contact URLs, Hebrew encoding, JSON-LD, consent gating, event metadata and revocation.');
