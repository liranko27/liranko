// Optional local QA tool: PLAYWRIGHT_MODULE may point to an existing playwright-core install.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:4322';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Synthetic tests must stay local');
const out = 'review-screenshots/attribution-landing';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const external=[];
 // No telemetry, tag code, synthetic campaign IDs or contact navigation reaches an external service.
 await context.route('**/*',route=>{
   if(new URL(route.request().url()).origin===new URL(base).origin)return route.continue();
   external.push(route.request().url()); return route.abort();
 });
 await context.addInitScript(()=>{
   window.__navigationChecks=[];
   document.addEventListener('click',e=>{
     const a=e.target.closest?.('a[href]');
     if(a && (/^(tel:|whatsapp:)/.test(a.href)||new URL(a.href).hostname==='wa.me')) {
       window.__navigationChecks.push({href:a.href,previouslyPrevented:e.defaultPrevented}); e.preventDefault();
     }
   });
 });
 const page=await context.newPage();
 const events=name=>page.evaluate(n=>(window.dataLayer||[]).filter(x=>x[0]==='event'&&x[1]===n).map(x=>x[2]),name);
 const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow: ${await page.title()}`);
 await page.goto(base+'/electrician-rosh-haayin?utm_source=google&utm_medium=cpc&utm_campaign=local_test&gclid=SYNTHETIC_LOCAL_ONLY&email=SECRET%40example.test&phone=0501234567&message=SECRET#contact');
 assert.equal(external.length,0); assert.equal((await events('page_view')).length,0);
 await page.locator('a[href^="tel:"]').first().click();
 assert.equal((await events('conversion')).length,0);
 await page.getByRole('button',{name:'דחייה',exact:true}).click();
 await page.reload(); assert.equal((await events('page_view')).length,0); assert.equal(external.length,0);
 await page.getByRole('button',{name:'העדפות פרטיות',exact:true}).click();
 await page.getByRole('button',{name:'אישור מדידה',exact:true}).click();
 assert.equal((await events('page_view')).length,1);
 const location=(await events('page_view'))[0].page_location;
 assert.ok(location.includes('utm_campaign=local_test')&&location.includes('gclid=SYNTHETIC_LOCAL_ONLY'));
 assert.ok(!/SECRET|email=|phone=|message=|#/.test(location));
 await page.locator('a[href="#services"]').click(); assert.equal((await events('page_view')).length,1);
 const before=(await events('conversion')).length;
 await page.locator('.hero a[href^="tel:"]').click();
 await page.locator('.hero a[href*="wa.me"]').click();
 assert.equal((await events('conversion')).length,before+2);
 assert.equal((await events('phone_click')).length,1); assert.equal((await events('whatsapp_click')).length,1);
 assert.ok(!JSON.stringify([await events('phone_click'),await events('whatsapp_click')]).includes('SECRET'));
 await page.getByRole('button',{name:'העדפות פרטיות',exact:true}).click();
 await page.getByRole('button',{name:'דחייה',exact:true}).click();
 await page.locator('.hero a[href^="tel:"]').click();
 assert.equal((await events('conversion')).length,before+2);
 assert.equal(await page.evaluate(()=>window['ga-disable-G-SQVD7F0LQW']),true);
 await page.reload(); assert.equal((await events('page_view')).length,0);
 await page.getByRole('button',{name:'העדפות פרטיות',exact:true}).click();
 await page.getByRole('button',{name:'אישור מדידה',exact:true}).click();
 await page.reload(); assert.equal((await events('page_view')).length,1);
 let covered=0;
 for(const route of ['/','/portfolio','/accessibility-draft','/electrician-rosh-haayin']) {
   await page.goto(base+route);
   const links=page.locator('a[href^="tel:"],a[href*="wa.me"]');
   for(let i=0;i<await links.count();i++) {
     const link=links.nth(i); const href=await link.getAttribute('href');
     if(!await link.isVisible())await page.setViewportSize({width:390,height:844});
     const old=(await events('conversion')).length;
     const method=href.startsWith('tel:')?'phone':'whatsapp';
     const oldGA=(await events(method+'_click')).length;
     await link.click();
     assert.equal((await events('conversion')).length,old+1);
     assert.equal((await events(method+'_click')).length,oldGA+1);
     assert.equal((await events('conversion')).at(-1).send_to,'AW-18506956448/'+(method==='phone'?'tMJsCNXO0KIdEKD95vhE':'ytXACNjO0KIdEKD95vhE'));
     assert.equal((await events(method+'_click')).at(-1).cta_location,await link.getAttribute('data-location')||'other');
     covered++;
   }
   assert.ok((await page.evaluate(()=>window.__navigationChecks)).every(x=>!x.previouslyPrevented));
 }
 await page.goto(base+'/electrician-rosh-haayin');
 for(const width of [1440,375,390,430]) {
   await page.setViewportSize({width,height:width===1440?1000:844});
   await page.goto(base+'/electrician-rosh-haayin'); await noOverflow();
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
   await page.screenshot({path:`${out}/landing-${width}.png`,fullPage:true});
   await page.screenshot({path:`${out}/hero-${width}.png`});
   await page.getByRole('button',{name:'העדפות פרטיות',exact:true}).click();
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   if(width<760) assert.equal(await page.locator('.mobile-contact').isVisible(),false,'Consent panel takes priority without overlapping sticky contacts');
   await page.screenshot({path:`${out}/consent-${width}.png`});
   await page.getByRole('button',{name:'דחייה',exact:true}).click();
   await page.getByRole('button',{name:'פתיחת תפריט נגישות',exact:true}).click();
   assert.ok(await page.locator('#accessibility-dialog').evaluate(d=>d.contains(document.activeElement)));
   for(let i=0;i<18;i++) {await page.keyboard.press('Tab'); assert.ok(await page.locator('#accessibility-dialog').evaluate(d=>d.contains(document.activeElement)));}
   await page.keyboard.press('Escape');
   assert.ok(await page.getByRole('button',{name:'פתיחת תפריט נגישות',exact:true}).evaluate(e=>e===document.activeElement));
   if(width<760) {
     const bar=await page.locator('.mobile-contact').boundingBox(); const dock=await page.locator('.accessibility-launcher').boundingBox();
     assert.ok(dock.y+dock.height<=bar.y,'Accessibility button stays above the contact bar');
     for(const a of await page.locator('.mobile-contact a').all()){const r=await a.boundingBox();assert.ok(r.height>=44&&r.width>=44);}
   }
   await noOverflow();
 }
 await page.setViewportSize({width:375,height:844});
 await page.getByRole('button',{name:'פתיחת תפריט נגישות',exact:true}).click();
 for(let i=0;i<5;i++)await page.locator('[data-text-step="1"]').click();
 await page.keyboard.press('Escape'); await noOverflow();
 await page.screenshot({path:`${out}/large-text-375.png`,fullPage:true});
 await context.close(); await browser.close();
 const result={coveredContactLinks:covered,viewports:[1440,375,390,430],consent:true,campaignFiltering:true,keyboardAndEscape:true,googleRequests:'blocked',calls:0,messages:0};
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)); console.log(result);
})().catch(e=>{console.error(e);process.exit(1)});
