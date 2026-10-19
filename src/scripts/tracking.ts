import { measurement } from '../data/measurement';

type Consent = 'granted' | 'denied';
type Contact = 'phone' | 'whatsapp';
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __lirankoMeasurementInitialized?: boolean;
  }
}

function initializeMeasurement() {
  const banner = document.querySelector<HTMLElement>('#consent-banner');
  const gtmId = document.body.dataset.gtm || '';
  const useGtm = /^GTM-[A-Z0-9]+$/.test(gtmId);
  const ga4Id = /^G-[A-Z0-9]+$/.test(measurement.ga4Id) ? measurement.ga4Id : '';
  const ads = measurement.ads;
  const validAdsId = /^AW-[1-9]\d+$/.test(ads.conversionId);
  const duplicateLabels = !!ads.phoneLabel && ads.phoneLabel === ads.whatsappLabel;
  let granted = false;
  let loaded = false;

  function destination(method: Contact) {
    const label = method === 'phone' ? ads.phoneLabel : ads.whatsappLabel;
    if (!validAdsId || duplicateLabels || typeof label !== 'string' || !/^[A-Za-z0-9_-]+$/.test(label)) return undefined;
    return `${ads.conversionId}/${label}`;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments);
  };
  function tag(...args: unknown[]) {
    try { window.gtag?.(...args); } catch { /* Measurement must never break a contact link. */ }
  }
  function consent(value: Consent, mode: 'default' | 'update') {
    tag('consent', mode, { ad_storage: value, analytics_storage: value, ad_user_data: value, ad_personalization: value });
  }
  consent('denied', 'default');

  function loadTags() {
    if (loaded) return;
    // A configured GTM container owns dispatch; otherwise reuse the existing Google tag.
    if (useGtm) {
      loaded = true;
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
      script.async = true;
      document.head.append(script);
      return;
    }
    const hasAds = !!(destination('phone') || destination('whatsapp'));
    const loaderId = ga4Id || (hasAds ? ads.conversionId : '');
    if (!loaderId) return;
    loaded = true;
    tag('js', new Date());
    if (ga4Id) {
      tag('config', ga4Id, { send_page_view: false });
      const page = new URL(window.location.href);
      tag('event', 'page_view', {
        send_to: ga4Id, page_title: document.title,
        page_location: `${page.origin}${page.pathname}`, page_path: page.pathname,
      });
    }
    if (hasAds) tag('config', ads.conversionId, { allow_enhanced_conversions: false });
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`;
    script.async = true;
    document.head.append(script);
  }

  function apply(value: Consent) {
    granted = value === 'granted';
    consent(value, 'update');
    if (granted) loadTags();
  }
  try {
    const saved = localStorage.getItem('liranko-consent');
    if (saved === 'granted' || saved === 'denied') apply(saved);
    else if (banner) banner.hidden = false;
  } catch { if (banner) banner.hidden = false; }

  document.querySelector('#consent-settings')?.addEventListener('click', () => {
    if (banner) banner.hidden = false;
    banner?.querySelector<HTMLButtonElement>('[data-consent="granted"]')?.focus();
  });
  document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.consent;
    if (value !== 'granted' && value !== 'denied') return;
    try { localStorage.setItem('liranko-consent', value); } catch { /* Choice still applies to this page. */ }
    apply(value);
    if (banner) banner.hidden = true;
  }));

  const placements = new Set(['header', 'header-portfolio', 'hero', 'services', 'about', 'contact', 'mobile-sticky', 'accessibility-draft']);
  function contactMethod(link: HTMLAnchorElement): Contact | undefined {
    try {
      const url = new URL(link.getAttribute('href') || '', window.location.href);
      if (url.protocol === 'tel:') return 'phone';
      if (url.protocol === 'whatsapp:') return 'whatsapp';
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
      if (url.hostname === 'wa.me' || url.hostname === 'www.wa.me') return 'whatsapp';
      if (['api.whatsapp.com', 'web.whatsapp.com', 'www.whatsapp.com', 'whatsapp.com'].includes(url.hostname) && /^\/send\/?$/.test(url.pathname)) return 'whatsapp';
    } catch { /* Unrelated or malformed links are not contact events. */ }
  }
  // One listener covers all current/future anchors, including nested SVG clicks.
  // Never cancel, delay, rewrite or replay navigation or pre-consent clicks.
  function trackContactClick(event: MouseEvent) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    if (!granted || !loaded || event.defaultPrevented) return;
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    const method = contactMethod(link);
    if (!method) return;
    // Only whitelisted metadata: no link URL, phone number, text or message contents.
    const location = placements.has(link.dataset.location || '') ? link.dataset.location! : 'other';
    const metadata = { cta_location: location, contact_method: method };
    const eventName = method === 'phone' ? 'phone_click' : 'whatsapp_click';
    if (useGtm) {
      window.dataLayer.push({ event: eventName, ...metadata });
      if (location === 'hero') window.dataLayer.push({ event: 'hero_cta_click', ...metadata });
      if (location === 'services') window.dataLayer.push({ event: 'service_cta_click', ...metadata });
      return; // No direct GA4 or Ads conversion in GTM mode.
    }
    if (ga4Id) tag('event', eventName, { send_to: ga4Id, ...metadata });
    const sendTo = destination(method);
    if (sendTo) tag('event', 'conversion', { send_to: sendTo });
  }
  document.addEventListener('click', trackContactClick, { capture: true });
  document.addEventListener('auxclick', trackContactClick, { capture: true });
}

if (!window.__lirankoMeasurementInitialized) {
  window.__lirankoMeasurementInitialized = true;
  initializeMeasurement();
}
