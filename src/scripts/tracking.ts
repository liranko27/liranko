export {};
type Consent = 'granted' | 'denied';
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const banner = document.querySelector<HTMLElement>('#consent-banner');
const id = document.body.dataset.gtm || '';
let granted = false;
let loaded = false;
let pageViewSent = false;
let analyticsLoaded = false;

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(...args: unknown[]) {
  window.dataLayer.push(args);
};

function command(..._args: unknown[]) { window.dataLayer.push(arguments); }
command('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
window.gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

function trackGtagPageView() {
  if (!granted || pageViewSent || typeof window.gtag !== 'function') return;

  window.gtag('config', 'G-SQVD7F0LQW', {
    anonymize_ip: true,
    send_page_view: false,
  });

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname,
  });

  pageViewSent = true;
}

function apply(value: Consent) {
  granted = value === 'granted';
  command('consent', 'update', { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value });
  window.gtag?.('consent', 'update', { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value });

  if (granted) {
    if (!analyticsLoaded && !/^GTM-[A-Z0-9]+$/.test(id)) {
      analyticsLoaded = true;
      window.gtag?.('js', new Date());
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-SQVD7F0LQW';
      script.async = true;
      document.head.append(script);
    }
    trackGtagPageView();
  } else {
    pageViewSent = false;
  }

  if (granted && !loaded && /^GTM-[A-Z0-9]+$/.test(id)) {
    loaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    script.async = true; document.head.append(script);
  }
}

try {
  const saved = localStorage.getItem('liranko-consent');
  if (saved === 'granted' || saved === 'denied') {
    apply(saved);
  } else if (banner) {
    banner.hidden = false;
  }
} catch {
  if (banner) banner.hidden = false;
}

document.querySelector('#consent-settings')?.addEventListener('click', () => {
  if (banner) banner.hidden = false;
  banner?.querySelector<HTMLButtonElement>('button[data-consent="granted"]')?.focus();
});
document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => {
  const value = button.dataset.consent as Consent;
  try { localStorage.setItem('liranko-consent', value); } catch { /* Session consent still works. */ }
  apply(value);
  if (banner) banner.hidden = true;
}));

document.querySelectorAll<HTMLAnchorElement>('[data-contact]').forEach(link => link.addEventListener('click', () => {
  const method = link.dataset.contact === 'phone' ? 'phone' : 'whatsapp';
  const metadata = { cta_location: link.dataset.location, selected_service: link.dataset.service || undefined, contact_method: method };

  if (granted && typeof window.gtag === 'function') {
    window.gtag('event', method === 'phone' ? 'phone_click' : 'whatsapp_click', metadata);
  }

  if (!granted || !loaded) return;
  window.dataLayer.push({ event: method === 'phone' ? 'phone_click' : 'whatsapp_click', ...metadata });
  if (link.dataset.location === 'hero') window.dataLayer.push({ event: 'hero_cta_click', ...metadata });
  if (link.dataset.location === 'services') window.dataLayer.push({ event: 'service_cta_click', ...metadata });
}));

