import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { measurement: production } = await import('data:text/javascript;base64,' + Buffer.from(compile('src/data/measurement.ts')).toString('base64'));
const source = compile('src/scripts/tracking.ts').replace(/^import .*?from ['"]\.\.\/data\/measurement['"];?\s*/m, '').replace(/export\s*\{\s*\};?/g, '');
// Synthetic fixtures for edge cases only. Configured real destinations are tested separately below.
const testAds = { conversionId: 'AW-12345678901', phoneLabel: 'TEST_PHONE_ONLY', whatsappLabel: 'TEST_WHATSAPP_ONLY' };

function setup({ ads = production.ads, gtm = '', saved = null, blocked = false, ga4Id = production.ga4Id, path = '/' } = {}) {
  const controls = new Map(); const clicks = []; const auxiliary = []; const scripts = []; const navigations = [];
  const element = name => ({ dataset: {}, hidden: true, focused: false,
    addEventListener: (event, fn) => controls.set(`${name}:${event}`, fn),
    querySelector: () => ({ focus() {} }),
  });
  const banner = element('banner'), settings = element('settings');
  const accept = element('accept'); accept.dataset.consent = 'granted';
  const reject = element('reject'); reject.dataset.consent = 'denied';
  const document = {
    title: 'LIRANKO', body: { dataset: { gtm } }, head: { append: script => scripts.push(script) },
    createElement: () => ({}), querySelector: selector => selector === '#consent-banner' ? banner : settings,
    querySelectorAll: selector => selector === '[data-consent]' ? [accept, reject] : [],
    addEventListener: (name, fn) => { assert.ok(['click','auxclick'].includes(name)); (name === 'click' ? clicks : auxiliary).push(fn); },
  };
  const storage = new Map(saved ? [['liranko-consent', saved]] : []);
  const window = { dataLayer: [], location: { href: `https://liranko.co.il${path}?private_query=SECRET#private-hash`, pathname: path } };
  const context = vm.createContext({ window, document, URL, Date, encodeURIComponent,
    measurement: { ga4Id, ads: { ...ads } },
    localStorage: { getItem: key => { if(blocked) throw Error('blocked'); return storage.get(key) || null; },
      setItem: (key,value) => { if(blocked) throw Error('blocked'); storage.set(key,value); } },
  });
  const initialize = () => vm.runInContext(source, context);
  initialize();
  const commands = () => window.dataLayer.filter(item => typeof item?.[0] === 'string').map(item => Array.from(item));
  const events = name => commands().filter(item => item[0] === 'event' && item[1] === name);
  function click(href, location, { nested = false, prevented = false, button = 0, keyboard = false } = {}) {
    const link = { dataset: { location, service: 'SECRET_SERVICE' }, getAttribute: key => key === 'href' ? href : null };
    const target = { closest: selector => { assert.equal(selector, 'a[href]'); return link; } };
    if (!nested) link.closest = target.closest;
    const event = { target: nested ? target : link, defaultPrevented: prevented, type: button ? 'auxclick' : 'click', button, detail:keyboard ? 0 : 1,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { throw Error('Must not stop navigation'); } };
    (button ? auxiliary : clicks).forEach(fn => fn(event));
    assert.equal(event.defaultPrevented, prevented, 'Measurement must not cancel navigation');
    assert.equal(link.getAttribute('href'), href, 'Measurement must not rewrite destinations');
    if (!event.defaultPrevented) navigations.push(href); // Simulation only; never launch an app.
  }
  return { initialize, window, banner, scripts, commands, events, click, clicks, auxiliary, navigations,
    accept: () => controls.get('accept:click')(), reject: () => controls.get('reject:click')() };
}

const ui = setup({ ads: testAds });
assert.equal(ui.commands().length, 1, 'Only one default consent command');
assert.equal(ui.scripts.length, 0);
ui.click('tel:0586567657', 'hero'); ui.click('https://wa.me/972586567657?text=SECRET', 'hero');
assert.equal(ui.events('conversion').length, 0);
ui.reject(); ui.click('tel:0586567657', 'header');
assert.equal(ui.scripts.length, 0); assert.equal(ui.events('phone_click').length, 0);
ui.accept();
assert.equal(ui.scripts.length, 1, 'Reuse one loader for GA4 and Ads');
assert.match(ui.scripts[0].src, /gtag\/js\?id=G-SQVD7F0LQW$/);
assert.equal(ui.commands().filter(item => item[0] === 'config' && item[1] === testAds.conversionId).length, 1);
assert.equal(ui.events('conversion').length, 0, 'Never replay pre-consent clicks');
assert.equal(ui.events('page_view').length, 1);
assert.equal(ui.events('page_view')[0][2].page_location, 'https://liranko.co.il/');
ui.click('tel:0586567657', 'hero', { nested: true });
ui.click('https://wa.me/972586567657?text=SECRET', 'mobile-sticky', { nested: true });
assert.deepEqual(ui.events('conversion').map(item => ({...item[2]})), [
  { send_to: `${testAds.conversionId}/${testAds.phoneLabel}` },
  { send_to: `${testAds.conversionId}/${testAds.whatsappLabel}` },
]);
assert.equal(ui.events('phone_click').length, 1); assert.equal(ui.events('whatsapp_click').length, 1);
assert.equal(ui.events('phone_click')[0][2].send_to, production.ga4Id);
assert.equal(ui.events('whatsapp_click')[0][2].send_to, production.ga4Id);
ui.click('tel:0586567657', 'user-entered-SECRET');
assert.equal(ui.events('phone_click').at(-1)[2].cta_location, 'other');
const serializedEvents = JSON.stringify(ui.commands().filter(item => item[0] === 'event'));
assert.doesNotMatch(serializedEvents, /SECRET|0586567657|972586567657|private_query|private-hash|selected_service|link_url|user_data|currency|"value"/);
const count = ui.events('conversion').length;
for(const href of ['#contact', '/portfolio', 'https://wa.me.evil.example/send', 'https://example.com/?url=https://wa.me/972586567657', 'https://web.whatsapp.com/not-send']) ui.click(href);
ui.click('tel:0586567657', 'hero', { prevented:true });
assert.equal(ui.events('conversion').length, count);
ui.reject(); ui.click('tel:0586567657'); ui.click('https://wa.me/972586567657');
assert.equal(ui.events('conversion').length, count);
ui.accept(); assert.equal(ui.scripts.length, 1); assert.equal(ui.events('page_view').length, 1);
ui.initialize(); assert.equal(ui.clicks.length, 1, 'Duplicate initialization must not duplicate handlers');
assert.equal(ui.auxiliary.length,1);
ui.click('tel:0586567657'); assert.equal(ui.events('conversion').length, count + 1);
ui.click('tel:0586567657','hero',{keyboard:true}); assert.equal(ui.events('conversion').length,count+2);
ui.click('https://wa.me/972586567657','hero',{button:1}); assert.equal(ui.events('conversion').length,count+3);
ui.click('https://wa.me/972586567657','hero',{button:2}); assert.equal(ui.events('conversion').length,count+3, 'Right-click menu is not a conversion');

for (const ads of [{ conversionId:'',phoneLabel:'',whatsappLabel:'' }, { ...testAds, conversionId:'' }, { ...testAds, conversionId:'123-456-7890' },
  { ...testAds, phoneLabel:'', whatsappLabel:'' }, { ...testAds, whatsappLabel:testAds.phoneLabel },
  { ...testAds, phoneLabel:' ', whatsappLabel:'<invalid>' }, { ...testAds, phoneLabel:undefined, whatsappLabel:undefined }]) {
  const disabled = setup({ ads, saved:'granted' });
  disabled.click('tel:0586567657'); disabled.click('https://wa.me/972586567657');
  assert.equal(disabled.events('conversion').length, 0, 'Missing/invalid/duplicate configuration must not send conversions');
}
for (const missing of ['phoneLabel','whatsappLabel']) {
  const partial = setup({ ads:{...testAds,[missing]:''}, saved:'granted' });
  partial.click('tel:0586567657'); partial.click('https://wa.me/972586567657');
  assert.equal(partial.events('conversion').length, 1, 'Only the configured action sends');
}
const adsOnly = setup({ads:testAds,ga4Id:'',saved:'granted'});
assert.equal(adsOnly.scripts.length,1); assert.match(adsOnly.scripts[0].src, /id=AW-12345678901$/);
adsOnly.click('tel:0586567657'); assert.equal(adsOnly.events('conversion').length,1);
const none = setup({ads:{conversionId:'',phoneLabel:'',whatsappLabel:''},ga4Id:'',saved:'granted'});
assert.equal(none.scripts.length,0);
const denied = setup({ads:testAds,saved:'denied'}); denied.click('tel:0586567657'); assert.equal(denied.scripts.length,0);
const blocked = setup({ads:testAds,blocked:true}); blocked.accept(); blocked.click('tel:0586567657'); assert.equal(blocked.events('conversion').length,1);

const gtm = setup({ads:testAds,gtm:'GTM-TEST123',saved:'granted'});
gtm.click('tel:0586567657','hero'); gtm.click('https://wa.me/972586567657','services');
assert.equal(gtm.scripts.length,1); assert.match(gtm.scripts[0].src,/gtm\.js/);
assert.equal(gtm.events('conversion').length,0); assert.equal(gtm.events('phone_click').length,0);
assert.deepEqual(gtm.window.dataLayer.filter(item=>item.event && item.event!=='gtm.js').map(item=>item.event),
  ['phone_click','hero_cta_click','whatsapp_click','service_cta_click']);
gtm.reject(); const before = gtm.window.dataLayer.length; gtm.click('tel:0586567657'); assert.equal(gtm.window.dataLayer.length,before);

// Verify the exact real destinations supplied by the account owner, with no network.
assert.deepEqual(production.ads, {
  conversionId:'AW-18506956448',phoneLabel:'tMJsCNXO0KIdEKD95vhE',whatsappLabel:'ytXACNjO0KIdEKD95vhE',
});
const configured = setup();
configured.click('tel:0586567657'); configured.click('https://wa.me/972586567657');
assert.equal(configured.events('conversion').length,0);
assert.equal(configured.scripts.length,0);
configured.accept();
assert.equal(configured.scripts.length,1);
assert.match(configured.scripts[0].src,/gtag\/js\?id=G-SQVD7F0LQW$/);
for(const id of [production.ga4Id,production.ads.conversionId]) {
  assert.equal(configured.commands().filter(item=>item[0]==='config' && item[1]===id).length,1,`Configure ${id} once`);
}
configured.click('tel:0586567657');
configured.click('https://wa.me/972586567657?text=SECRET');
assert.deepEqual(configured.events('conversion').map(item=>({...item[2]})),[
  {send_to:'AW-18506956448/tMJsCNXO0KIdEKD95vhE'},
  {send_to:'AW-18506956448/ytXACNjO0KIdEKD95vhE'},
]);
configured.reject();
configured.click('tel:0586567657'); configured.click('https://wa.me/972586567657');
assert.equal(configured.events('conversion').length,2);
configured.accept(); configured.initialize();
assert.equal(configured.scripts.length,1);
assert.equal(configured.clicks.length,1);
configured.click('tel:0586567657');
assert.equal(configured.events('conversion').length,3);
assert.equal(configured.commands().filter(item=>item[0]==='config' && item[1]===production.ads.conversionId).length,1);

// Exercise every rendered anchor against the actual configured phone/WhatsApp destination.
let covered = 0;
for (const route of ['index.html','portfolio/index.html','accessibility-draft/index.html']) {
  const html = fs.readFileSync(`dist/${route}`,'utf8');
  assert.equal((html.match(/id="consent-banner"/g)||[]).length,1);
  assert.equal((html.match(/id="consent-settings"/g)||[]).length,1);
  const page = setup({saved:'granted',path:`/${route}`});
  for (const [tag,href] of html.matchAll(/<a\b[^>]*href="((?:tel:|https:\/\/wa\.me\/)[^"]+)"[^>]*>/g)) {
    const location = tag.match(/data-location="([^"]+)"/)?.[1];
    const before = page.events('conversion').length;
    page.click(href.replaceAll('&amp;','&'),location,{nested:true});
    assert.equal(page.events('conversion').length,before+1,`${route}: one conversion per contact activation`);
    const expectedLabel = href.startsWith('tel:') ? production.ads.phoneLabel : production.ads.whatsappLabel;
    assert.equal(page.events('conversion').at(-1)[2].send_to,`${production.ads.conversionId}/${expectedLabel}`);
    covered++;
  }
}
for(const href of ['TEL:0586567657','https://api.whatsapp.com/send?phone=972586567657&text=SECRET','https://web.whatsapp.com/send?phone=972586567657','whatsapp://send?phone=972586567657']) {
  const before = ui.events('conversion').length; ui.click(href); assert.equal(ui.events('conversion').length,before+1);
}
assert.ok(covered>=16);
console.log(`Tracking QA passed: ${covered} rendered contact links; one matching conversion per click; consent/withdrawal; empty/partial/invalid config; GTM exclusivity; no private click parameters; unchanged navigation. All interactions simulated without network, calls or messages.`);
