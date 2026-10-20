import { measurement } from '../data/measurement';

type Consent = 'granted' | 'denied';
type Contact = 'phone' | 'whatsapp';
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __lirankoMeasurementInitialized?: boolean;
    [key: `ga-disable-${string}`]: boolean;
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
  // Memory only; static document navigations start a fresh instance (no pre-consent storage).
  const campaignKeys = new Set(['gclid', 'dclid', 'gbraid', 'wbraid', 'gad_source', 'gad_campaignid',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content',
    'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic']);
  function filteredUrl(raw: string, campaigns = true) {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      const clean = new URL(url.origin + url.pathname);
      if (campaigns) for (const [key, value] of url.searchParams) {
        // Campaign metadata must never contain customer-provided free text.
        if (campaignKeys.has(key) && !clean.searchParams.has(key) && value.length <= 200 &&
            !/[\u0000-\u001f@]/.test(value) && !/(?:\+?972|0)[ -]?5\d(?:[ -]?\d){7}/.test(value)) clean.searchParams.set(key, value);
      }
      return clean.href;
    } catch { return ''; }
  }
  const landing = new URL(filteredUrl(window.location.href));
  const referrerUrl = filteredUrl(document.referrer || '', false);
  const referrer = referrerUrl ? new URL(referrerUrl).origin + '/' : '';
  try {
    const previous = new URL(filteredUrl(document.referrer || ''));
    if (previous.origin === landing.origin && !landing.search) {
      previous.searchParams.forEach((value, key) => landing.searchParams.set(key, value));
    }
  } catch { /* A same-origin referrer can retain campaign metadata for one document hop. */ }
  const pageContext = { page_location: landing.href, page_referrer: referrer, page_path: landing.pathname };

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
    // Sanitize defaults for automatic/engagement events as well as our explicit events.
    tag('set', pageContext);
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
      tag('config', ga4Id, { send_page_view: false, ...pageContext });
      tag('event', 'page_view', {
        send_to: ga4Id, page_title: document.title,
        ...pageContext,
      });
    }
    if (hasAds) tag('config', ads.conversionId, { allow_enhanced_conversions: false, ...pageContext });
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`;
    script.async = true;
    document.head.append(script);
  }

  function apply(value: Consent) {
    granted = value === 'granted';
    if (ga4Id) window[`ga-disable-${ga4Id}`] = !granted;
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
    if (ga4Id) tag('event', eventName, { send_to: ga4Id, ...pageContext, ...metadata });
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
