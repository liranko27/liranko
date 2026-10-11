# LIRANKO — Hebrew RTL Astro landing page

## Local development

Requirements: Node.js 22.12+ and npm. On Windows use `npm.cmd` if PowerShell blocks npm.ps1.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

`build` runs Astro/TypeScript checking and creates the static `dist/` directory. Original supplied PNGs remain untouched. Astro creates responsive WebP variants from copies in `src/assets/`. No UI framework, backend, contact form, external font, or image CDN is required.

## Configuration and launch checklist

Edit **src/data/business.ts**:

- Set `phone` in Israeli international format (`+972...`, no spaces). `whatsapp` defaults to the same number; optionally set a separate WhatsApp-enabled number.
- Set `domain` to the real HTTPS origin. Until then the page is noindex, robots disallows crawling, canonical/absolute previews are omitted, and the sitemap is empty.
- Confirm the exact qualification wording and that each offered service is within the owner's authorization. Update service copy if needed, then set `servicesApproved: true`. No qualification is shown unless provided.
- Optionally set `gtmId` to `GTM-XXXXXXX`; social links can remain empty.
- Add approved real project photos. No testimonials, license number, years, warranties, ratings, emergency availability or address have been invented.

Missing contacts render disabled, visibly marked buttons with no broken tel/WhatsApp links. Never launch Ads against this preview configuration. Production deployment must use the guarded build below; an ordinary local build intentionally permits placeholders.

```sh
npm run check:launch && npm run build
```

## Structure

- `src/pages/index.astro`: semantic Hebrew landing page, metadata and verified LocalBusiness JSON-LD.
- `src/components/`: reusable SVG icons and contact buttons.
- `src/data/business.ts`: all business/contact/SEO/tracking configuration and encoded contact URLs.
- `src/data/services.ts`: service descriptions.
- `src/data/projects.ts`: typed real-project gallery entries (empty initially).
- `src/scripts/tracking.ts`: consent controls and CTA dataLayer events.
- `src/styles/global.css`: responsive RTL styles, visible focus, reduced motion.
- `src/pages/robots.txt.ts`, `sitemap.xml.ts`: generated crawl configuration.

Put real photos in `public/projects/`, then add `{ title, description, image: '/projects/file.webp', alt, width, height }` entries to projects.ts. Export appropriately sized WebP photos (roughly 1000px wide). Use actual image dimensions; avoid including customer personal details without permission.

## GTM, GA4 and Google Ads

1. Create a GTM **Web** container. Set its ID in business.ts. The site uses basic consent behavior: all four Google consent signals default to denied; GTM itself is only loaded after acceptance. No noscript tracking iframe is used. The footer allows changing consent. Choice is stored locally; blocked storage falls back to session behavior. No pre-consent CTA events are collected or replayed.
2. In GA4 create a Web data stream for the final domain. Add a Google tag in GTM with its `G-...` ID. Require analytics_storage consent. Enable consent checks for every tag, including custom tags; don't add a second direct GA snippet.
3. Add Data Layer Variables (version 2): `cta_location`, `selected_service`, `contact_method`. Add Custom Event triggers for `phone_click`, `whatsapp_click`, `hero_cta_click`, `service_cta_click`. Send corresponding GA4 events with those parameters. A hero/service click intentionally emits the contact event plus a placement event.
4. In Google Ads create separate website click conversion actions for phone and WhatsApp, clearly named **contact click**, set lead counting to **One**, and obtain conversion ID/label. In GTM configure the Google Ads conversion tags and Conversion Linker with the appropriate ad consent requirements. Map tags only to `phone_click` and `whatsapp_click`; placement events are analysis only. A click is intent, not proof of a completed inquiry. Start click actions as secondary if optimizing toward verified leads elsewhere.
5. Choose either direct Ads tags or imported GA4 key events as the conversion source for each action. Do not count both as primary. Do not attach Ads tags to hero/service placement events or generic link-click triggers as well. No enhanced conversions/customer data are sent.
6. Test in GTM Preview/Tag Assistant using a configured test number. Before acceptance, verify no GTM/GA/Ads network requests. Decline and confirm clicks still work but produce no tracking events. Accept, click each placement, and confirm one contact event plus only the relevant placement event. Verify denied consent after revocation prevents future events/tags. In GA4 DebugView enable debug_mode in preview/test configuration and confirm event parameters, then remove the debug override. Publish the GTM container after validating consent checks.

Consent revocation updates Google's consent signals and stops site events; already loaded scripts remain in the browser and must honor consent checks. For tag sets needing removal of vendor cookies, or a fuller regional consent policy, integrate a suitable CMP before adding those vendors.

References: [Google consent setup](https://developers.google.com/tag-platform/security/guides/consent), [Tag Assistant](https://support.google.com/tagmanager/answer/10039345).

## Deployment — Cloudflare Pages

No deployment has been performed. Once business configuration is complete and deployment is approved:

1. Commit source plus package-lock.json to your Git repository (exclude node_modules/dist). Connect the repo in Cloudflare **Workers & Pages → Pages → Import an existing Git repository**.
2. Framework preset: Astro; root: this project; build command: `npm run check:launch && npm run build`; output: `dist`. Use Node 22.12+ or a compatible supported version. No adapter is required for this static build.
3. Use the Pages project's **Custom domains** screen to add your domain. For an apex domain, add the domain as a Cloudflare zone and use its nameservers. For a subdomain follow the provided CNAME instructions. Add the domain through Pages before changing DNS. Cloudflare provisions HTTPS once DNS validation succeeds. Update business.domain and rebuild for the final canonical URL.
4. Future changes: edit source/config/photos, run checks and build, commit and push; Pages builds the new version. Review branch previews before merging.
5. Verify HTTPS, mobile/RTL layout, all section anchors, configured tel/wa.me links, encoded message, consent behavior, production metadata and `/robots.txt` plus `/sitemap.xml`. Validate JSON-LD with Schema.org Validator (a LocalBusiness with no invented address is intentional; no rich-result eligibility is promised). Run Lighthouse on production; scores are targets, not measured claims.
6. Add a Search Console Domain property, verify through DNS TXT, then submit `https://YOUR-DOMAIN/sitemap.xml` and inspect the homepage URL. Ensure no preview noindex remains after the domain is configured.

References: [Astro on Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/), [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## Verification completed

Production build and Astro/TypeScript checks pass with zero errors, warnings or hints. Run `npm run verify` after building to check generated anchors/assets, RTL and metadata, verified JSON-LD, disabled placeholder contacts, valid contact URL encoding, consent gating, event metadata and consent revocation. The launch guard intentionally fails until required business details are supplied. The dependency audit reports zero vulnerabilities. Browser rendering, mobile screenshots, browser console and Lighthouse could not be checked because no browser surface was connected; perform the browser checks listed above before launch.
