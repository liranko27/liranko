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

## GA4, Google Ads and consent

The current site reuses the existing Google tag (GA4 G-SQVD7F0LQW); business.gtmId is empty. Do not install a second tag or onclick snippet. The shared Measurement component runs on every page, including accessibility, and a delegated handler covers all phone/WhatsApp anchors without changing navigation.

Google Ads conversion settings live in **src/data/measurement.ts**: conversionId (including AW-), phoneLabel and whatsappLabel. The actual conversion ID AW-18506956448 and separate phone/WhatsApp labels supplied by the account owner are configured locally and tested; deployment is still awaiting approval. Missing/invalid labels disable the corresponding action; identical labels disable both. Never use the Ads customer/account number as a tag ID.

Only consented clicks emit events. Direct GA4 events have an explicit GA4 destination; Ads conversion events have a separate explicit AW destination and no value, currency or customer data. An optional valid GTM ID switches ownership to the container and disables direct GA4/Ads dispatch; never configure both routes for the same action. Existing GTM placement events must not trigger additional conversions.

Run npm run build, npm run check:tracking and npm run verify. The tracking tests simulate clicks with no network or navigation. Native browser/Tag Assistant and Ads receipt checks still require actual IDs and labels. Keep click actions Secondary and Count=One while validating; campaign goal/bidding changes require explicit approval.

See [GOOGLE_ADS_SETUP.md](GOOGLE_ADS_SETUP.md) for the audit, exact configured values, action setup reference, safe Tag Assistant verification and optimization implications. This tracking update is local only until approved for deployment.

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
