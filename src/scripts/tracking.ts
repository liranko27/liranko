export {};
type Consent = 'granted' | 'denied';
declare global { interface Window { dataLayer: unknown[]; } }
const banner = document.querySelector<HTMLElement>('#consent-banner')!;
const id = document.body.dataset.gtm || '';
let granted = false;
let loaded = false;
window.dataLayer = window.dataLayer || [];
function command(..._args: unknown[]) { window.dataLayer.push(arguments); }
command('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
function apply(value: Consent) {
  granted = value === 'granted';
  command('consent', 'update', { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value });
  if (granted && !loaded && /^GTM-[A-Z0-9]+$/.test(id)) {
    loaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    script.async = true; document.head.append(script);
  }
}
try { const saved = localStorage.getItem('liranko-consent'); if (saved === 'granted' || saved === 'denied') apply(saved); else if (id) banner.hidden = false; } catch { if (id) banner.hidden = false; }
document.querySelector('#consent-settings')?.addEventListener('click', () => { banner.hidden = false; banner.querySelector<HTMLButtonElement>('button')?.focus(); });
document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => {
  const value = button.dataset.consent as Consent;
  try { localStorage.setItem('liranko-consent', value); } catch { /* Session consent still works. */ }
  apply(value); banner.hidden = true;
}));
document.querySelectorAll<HTMLAnchorElement>('[data-contact]').forEach(link => link.addEventListener('click', () => {
  if (!granted || !loaded) return;
  const metadata = { cta_location: link.dataset.location, selected_service: link.dataset.service || undefined, contact_method: link.dataset.contact };
  window.dataLayer.push({ event: link.dataset.contact === 'phone' ? 'phone_click' : 'whatsapp_click', ...metadata });
  if (link.dataset.location === 'hero') window.dataLayer.push({ event: 'hero_cta_click', ...metadata });
  if (link.dataset.location === 'services') window.dataLayer.push({ event: 'service_cta_click', ...metadata });
}));

