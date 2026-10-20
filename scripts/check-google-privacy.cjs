// Downloads Google tag scripts only; all telemetry is intercepted and aborted.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
const b=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const c=await b.newContext();const seen=[];
await c.route('**/*',async r=>{const q=r.request();const u=new URL(q.url());if(u.hostname==='127.0.0.1')return r.continue();
const raw=decodeURIComponent(q.url())+' '+(q.postData()||'');
if(u.hostname==='www.googletagmanager.com'&&u.pathname.startsWith('/gtag/')&&!raw.includes('SECRET')&&!u.searchParams.has('dl'))return r.continue();
seen.push({url:q.url(),body:q.postData(),private:raw.includes('SECRET')});return r.abort();});
const p=await c.newPage();await p.goto('http://127.0.0.1:4322/electrician-rosh-haayin?utm_source=google&utm_medium=cpc&utm_campaign=local_test&email=SECRET%40example.test&q=SECRET#SECRET');
assert.equal(seen.length,0);
await p.getByRole('button',{name:'אישור מדידה'}).click();
await p.waitForFunction(()=>window.google_tag_manager?.['G-SQVD7F0LQW']);
await p.evaluate(()=>window.addEventListener('click',e=>{if(e.target.closest?.('a[href^="tel:"],a[href*="wa.me"]'))e.preventDefault()}));
await p.locator('.hero a[href*="wa.me"]').click();await p.locator('.hero a[href^="tel:"]').click();
await p.locator('a[href="#services"]').click();
await p.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
await p.waitForTimeout(2500); // Allow automatic tag events/batches; no measurement may leave this browser.
await p.getByRole('button',{name:'העדפות פרטיות'}).click();await p.getByRole('button',{name:'דחייה'}).click();
const before=seen.length;
await p.locator('.hero a[href^="tel:"]').click();
await p.waitForTimeout(500);
fs.writeFileSync('review-screenshots/attribution-landing/google-intercept.json',JSON.stringify(seen,null,2));
assert.equal(seen.filter(r=>r.private).length,0,'No synthetic personal fields in outgoing tag packets');
assert.equal(seen.length,before,'No new measurements after consent withdrawal');
const packets=seen.map(r=>new URL(r.url));
const pageviews=packets.filter(u=>u.searchParams.get('en')==='page_view'&&u.searchParams.get('tid')==='G-SQVD7F0LQW');
assert.equal(new Set(pageviews.map(u=>u.searchParams.get('_s'))).size,1,'One GA4 page view including after an anchor change');
for(const event of ['page_view','phone_click','whatsapp_click']) {
 const u=packets.find(u=>u.pathname==='/g/collect'&&u.searchParams.get('en')===event&&u.searchParams.get('tid')==='G-SQVD7F0LQW');
 assert.ok(u,event+' actual tag packet captured');
 assert.ok(u.searchParams.get('dl').includes('utm_campaign=local_test'));
}
for(const label of ['tMJsCNXO0KIdEKD95vhE','ytXACNjO0KIdEKD95vhE'])assert.equal(packets.filter(u=>u.hostname==='www.googleadservices.com'&&u.pathname==='/pagead/conversion/18506956448/'&&u.searchParams.get('label')===label).length,1);
console.log({requestsInterceptedAndBlocked:seen.length,privateFields:0,GA4PageViews:1,AdsEventsPerAction:1,consentWithdrawal:true});await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
