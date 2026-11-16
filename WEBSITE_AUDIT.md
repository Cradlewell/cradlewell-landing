# Cradlewell website: codebase and performance audit

**Date:** 16 Nov 2026 · **Commit audited:** `6ae8ab8` (master) · **Live site:** https://www.cradlewell.com

**Scope:** the marketing site, the blog, the API routes, `/crm` and `/operations`. This was a read-only audit. No code, data, schema or settings were changed and nothing was deployed. No real enquiries, messages or bookings were sent: the form and chat calls were answered inside the test browser.

**Evidence labels:**
- **[M]** = measured on the live site.
- **[C]** = confirmed in code or a live response.
- **[I]** = inferred, not verified.

Every number marked "estimate" is a projection, not a measurement.

**How it was measured:**
- **Lab tests:** Playwright (Chromium) on the live site with the cache disabled.
- **"Mobile":** 412×823 phone, 4× CPU slowdown, 150 ms RTT and about 1.6 Mbps download (Lighthouse's mobile profile). **"Desktop":** 1350×940, no throttling.
- **Main-thread breakdown:** a Chrome performance trace.
- **Not used:** Lighthouse and PageSpeed. Lighthouse isn't installed and nothing was installed without approval. These are lab numbers from one machine, not real-user (field) data.

---

## 1. Executive summary

**Overall health.** The site works:
- All pages return 200, with one H1 each and no sideways scrolling on phone or desktop. A real 404 page exists.
- The enquiry form validates and submits. TypeScript has 0 errors and ESLint 0 errors.

But it is **very slow on phones** and has **a few serious security gaps**.

**Biggest performance problems [M]:**
1. **The homepage downloads about 27.5 MB of images.** One photo, `award_photo.png`, is **21.8 MB** (6000×4000 pixels). It loads straight away on every visit and is shown at about 1/5 of its size. On the mobile profile, **LCP was 41 s**, and one run didn't finish loading within 90 s.
2. **None of the marketing images go through Next's image optimiser**, and every file in `/public` is served with `Cache-Control: max-age=0`. The hero image is a 1.9 MB PNG.
3. **Marketing scripts dominate the main thread.** On desktop, before any throttling, Google Ads, Meta Pixel, GTM and GA4 take about **3.2 s** of main-thread time between them, giving about 4–6 s of blocked time (TBT).
4. **A 464 KB image (`bannerimg.png`) is preloaded at high priority on every page**, but it never appears on screen; it is only the social-share picture. It competes with the real hero image.
5. **Blog posts are never cached** (`force-dynamic` + `no-store`), so each view waits on WordPress: **0.9–1.4 s before the first byte**. The blog index shows **"coming soon" with 0 posts**, although WordPress has 3.

**Critical security findings [C]:**
1. **Three Google Maps API keys are publicly downloadable** in `public/trip-planner.html`, which is live and committed to git.
2. **`/chat` is a public, unthrottled endpoint that calls Claude (Sonnet)** with no size limits. Nothing on the site uses it.
3. **`next@16.2.1` has a critical advisory group**, including **middleware-bypass** bugs. The CRM/ops API check (`requireAuth`) trusts a header that only the middleware sets, so a bypass would open the CRM data.
4. **WordPress HTML is inserted into the page unsanitised**, on the same origin as the CRM, and there is **no Content-Security-Policy**.

**Top five improvements:**
1. Rotate the Google keys and remove `trip-planner.html`; delete `/chat`; upgrade Next and zod.
2. Compress and resize the images, serve them through `next/image`, lazy-load everything below the fold, and fix the preload. *Estimate:* homepage image weight from 27.5 MB to under 1.5 MB.
3. Load the marketing tags after the page is interactive (`next/script` `lazyOnload`/`afterInteractive`, or GTM only). Remove the duplicate GA tag.
4. Fix the blog: cache posts (ISR), list posts on `/blog`, give each post real metadata and a canonical, return a real 404 for missing posts, and redirect the bare domain to www.
5. Make `requireAuth` verify the token itself, sanitise WordPress HTML, add a CSP, and add Origin checks on CRM/ops writes.

---

## 2. Issues and recommendations

### P0: critical security

| # | Issue | File / location | Evidence | Impact | Recommended fix |
|---|---|---|---|---|---|
| P0-1 | Google Maps API keys exposed | `public/trip-planner.html:529-533` | [M] `GET /trip-planner.html` returns 200; 6 `AIza` matches (3 keys: Maps, Routes, Places). The file is in git. Its own comment says anyone who can read it can spend against the keys. It is an unrelated app ("Namma Route"). Not tested: whether the keys are restricted by referrer. | Billing abuse | **Rotate all 3 keys** in Google Cloud, restrict them by HTTP referrer and API, and move the file out of `public/`. Rotation is required because the keys stay in git history. |
| P0-2 | Public LLM endpoint with no limits | `src/app/chat/route.ts:7-16, 136-145` | [C] No rate limit; zod has no `.max()` on message count or length; calls `claude-sonnet-4-6` with `max_tokens:1024`. [M] `GET /chat` returns 405, so the route is deployed. Nothing in `src/` calls it (the widget uses `/api/chat`). | Free Claude proxy for anyone, costing money; off-brand medical answers | Delete the route, `lib/cradlewell-knowledge.ts`, `lib/chat-utils.ts` and `@anthropic-ai/sdk`. Remove `ANTHROPIC_API_KEY` from Vercel. Check Vercel logs for `/chat` traffic first. |
| P0-3 | Vulnerable framework, plus API auth that trusts a header | `package.json` (`next 16.2.1`); `src/lib/auth-guard.ts:3-8`; `src/middleware.ts:200,240` | [C] `npm audit`: 1 critical and 10 high, 22 in total. The `next` advisories include middleware/proxy bypasses. `requireAuth` only checks `x-cw-auth === "1"`, which the middleware sets. | If the middleware is ever skipped, a request carrying `x-cw-auth: 1` gets full CRM/ops read, write and delete | Upgrade `next` to the latest 16.x (above 16.4.0) and `zod` to 4.6.6 or later. Make `requireAuth` verify the JWT cookie and role itself. |

### P1: major performance, security or functional

| # | Issue | File / location | Evidence | Impact | Recommended fix |
|---|---|---|---|---|---|
| P1-1 | 21.8 MB award photo loaded eagerly | `src/components/TrustedByStrip.tsx:183-187`; `public/images/award_photo.png` | [M] 6000×4000 PNG, 21,813 KB transferred on every homepage view; plain `<img>` with no `loading="lazy"`. | On mobile it uses all the bandwidth: LCP 41 s and the page never finishes loading | Export it at about 1600 px as WebP or AVIF (*estimate* 150–300 KB). Use `next/image` with `sizes` and lazy loading. |
| P1-2 | Hero (LCP) image is a 1.9 MB PNG served raw | `src/components/HeroHeaderShape.tsx:95-103` | [M] 1,870 KB, 1693×929. It is the LCP element on mobile. `width/height` are set to 600×500, which doesn't match its real proportions. | Slow LCP | `next/image` with `priority`, `sizes="(max-width: 992px) 100vw, 50vw"`, real dimensions and WebP/AVIF output (*estimate* 80–150 KB). |
| P1-3 | Wrong image preloaded on every page | `src/app/(site)/layout.tsx:289` | [C] `<link rel="preload" as="image" href="/images/bannerimg.png" fetchPriority="high">`. `bannerimg.png` (464 KB) is not shown on any page; it is only the OG image (`layout.tsx:42,54`). [M] It loads on every page. | Wastes 464 KB per page and competes with the LCP image | Remove the preload. If anything, preload the hero image (`next/image priority` does this). |
| P1-4 | Third-party scripts block the main thread | `src/app/(site)/layout.tsx:294-316, 350` | [M] Desktop trace main-thread time: Google Ads `gtag/js?id=AW-…` **1,233 ms**; Meta `signals/config` **714 ms**; `fbevents.js` **540 ms**; GTM **about 400 ms**; GA `gtag` **about 260 ms**. TBT: 4.1–6.0 s on desktop and 15–80 s on mobile. GA is loaded directly and probably also by GTM (ESLint `next-script-for-ga`). | Poor responsiveness (INP/TBT) on every page | Load everything through GTM only, or use `next/script` `strategy="lazyOnload"`, or Partytown. Remove the duplicate GA tag. Check in GTM that Ads and Pixel don't fire twice. |
| P1-5 | Other large images served raw | `globals.css:503` `background.png` 1.1 MB; `HeroBelow.tsx:141` `img1.png` 618 KB; `TrustedByStrip.tsx:31-40` `DPIIT_logo.png` 703 KB, `iso_9001.png` 479 KB, `iso_27001.png` 232 KB | [M] Transferred on every homepage view. Logos are full-size PNGs. | Several MB on a mobile connection | Convert to WebP/AVIF at the displayed size. Logos should be SVG or around 20 KB. Lazy-load anything below the fold. |
| P1-6 | `/public` images not cached by browsers | Vercel defaults | [M] `/images/*.png` returns `Cache-Control: public, max-age=0, must-revalidate`. JS chunks are cached for a year. | Repeat visitors re-check every image | Use `next/image` (whose output is cached), or add a `headers()` rule for `/images/:path*` with `max-age=31536000, immutable` and versioned file names. |
| P1-7 | `/blog` shows no posts | `src/app/(site)/blog/page.tsx:31-32` | [M] The live page says "New articles coming soon" and has no `/blog/<slug>` links. WordPress returns 3 posts. The page reads `process.env.WORDPRESS_API`, which is probably not set in Vercel [I]; the post page and the sitemap hard-code `blog.cradlewell.com`. | Blog is empty; posts can only be found through the sitemap | Use one shared constant, or set `WORDPRESS_API` in Vercel. |
| P1-8 | Blog posts never cached | `src/app/(site)/blog/[slug]/page.tsx:4, 77-80` | [M] `x-vercel-cache: MISS` every time; TTFB 0.88–1.36 s. [C] `force-dynamic` plus `cache:"no-store"`; `res.ok` is not checked. | Slow posts, and the blog goes down whenever WordPress does | ISR (`revalidate = 300`), `generateStaticParams`, handle `!res.ok`, and `notFound()` for missing slugs. |
| P1-9 | Blog post SEO metadata always empty | `blog/[slug]/page.tsx:30-31` | [M] The live post title is just "Cradlewell"; there is no canonical; `og:url` is the homepage. [C] The RankMath response has no `title` field, so the function returns `{}`. | Posts can't rank | Build the metadata from the WordPress post (title, excerpt, image) and always set the canonical. |
| P1-10 | Unsanitised WordPress HTML on the CRM's domain | `blog/[slug]/page.tsx:142,176`; `blog/page.tsx:88,92` | [C] `dangerouslySetInnerHTML` for the title, content and excerpt; no CSP. WordPress exposes its admin username (`/wp-json/wp/v2/users`) and version headers. | A WordPress compromise means script running on www.cradlewell.com, which can read `/api/crm/v2` for anyone logged in to the CRM | Sanitise on the server (`sanitize-html` / `isomorphic-dompurify`; needs approval to install), add a CSP, and harden WordPress. Long term, serve the CRM on its own subdomain. |
| P1-11 | No Content-Security-Policy | `next.config.mjs:21-45` | [M] Missing from live headers. HSTS, nosniff, X-Frame-Options and Referrer-Policy are present. | No defence against injected script | Roll out a CSP in Report-Only mode first, with a stricter policy for `/crm` and `/operations`. |
| P1-12 | Bare domain serves a duplicate site | Vercel domains | [M] `https://cradlewell.com/` returns 200 with the full site (its canonical points to www). | Duplicate host; split ranking signals | Add a 308 redirect from `cradlewell.com` to `www` in Vercel Domains. |
| P1-13 | Homepage title is just "Cradlewell" | `src/app/layout.tsx:13-19` | [M] `<title>Cradlewell</title>`. The good title only exists in `openGraph.title`. | Weaker ranking for "newborn/postnatal care Bangalore" | Set the homepage `title` to "Nurse-led Newborn & Postnatal Home Care in Bangalore \| Cradlewell". |
| P1-14 | Public form can overwrite existing CRM records | `src/app/api/lead/route.ts:121-172, 93` | [C] When the phone matches, the form overwrites name, address, hospital and shift, and resets dead stages. `source` is set by the caller. | Anyone who knows a customer's number can corrupt their record | For existing leads, only fill empty fields and log the submission as a note. Set `source` on the server from an allow-list. |
| P1-15 | WhatsApp tables have RLS turned off | Supabase: `whatsapp_events`, `whatsapp_sessions`, `whatsapp_messages` | [C, from earlier session] RLS is off and there are no policies (batch B still pending). | Phone numbers and chats can be read with the anon key | Enable RLS once you've confirmed the WhatsApp bot uses the service key. |

### P2: moderate

| # | Issue | Location | Evidence | Recommended fix |
|---|---|---|---|---|
| P2-1 | Fonts block rendering, and there are more weights than needed | `(site)/layout.tsx:281-287` | [C] Google Fonts stylesheet in `<head>`: Lexend 6 weights + Source Sans 3 6 weights. ESLint `no-page-custom-font`. | Switch to `next/font/google` (self-hosted, preloaded, no layout shift) and keep only the weights actually used. |
| P2-2 | Bootstrap CSS on every page and on `/operations` | `(site)/layout.tsx:7`; `operations/layout.tsx:2` | [C] Full `bootstrap.min.css` (about 227 KB raw) on every marketing page and on ops. Ops uses no Bootstrap classes [I: needs a visual check]. | Remove it from the ops layout after a visual check. Longer term, import only the Bootstrap parts in use. |
| P2-3 | GSAP shipped on every marketing page for a click effect | `src/components/MouseEffects.tsx`; chunk `02fj-2zep8jp8.js` | [M] 101 KB raw (36 KB gzip) including GSAP and ScrollTrigger. | Replace with a CSS effect or drop it. *Estimate:* saves about 36 KB gzip and some main-thread work. |
| P2-4 | Two very long layout passes on the homepage | Homepage | [M] Trace shows `Layout` tasks of 338 ms and 798 ms (desktop). Likely cause [I]: the huge award image plus the coverflow and marquee sections. | Re-measure after the image fixes; if still slow, reserve sizes for images and carousels and cut nested layout. |
| P2-5 | API routes run far from the database | `/api/lead`, `/api/crm/auth`, `/api/ops/*` | [C] Only `/api/crm/v2` is pinned to `bom1`. The database is in AWS Mumbai. `/api/lead` makes 4–5 database calls one after another. | Add `export const preferredRegion = "bom1"` to those routes. *Estimate:* about 0.5–1 s faster form submits. |
| P2-6 | Structured data repeated and partly wrong on every page | `(site)/layout.tsx:17-273` | [M] Five JSON-LD blocks on every page. BreadcrumbList is hard-coded to Home > Blog > Privacy. The FAQPage appears on every page (9 questions in the schema vs 10 on the page). Self-serving AggregateRating 4.8/28. SearchAction points at a search that doesn't exist. **4 Person images 404** (`/images/lokesh.jpg`, `venu.jpg`, `madhu.jpg`, `vishnu.jpg`). | Keep Organization/WebSite site-wide and put the rest on the right pages. Remove the rating unless it comes from a third party. Fix the image paths. |
| P2-7 | Missing blog posts return 200 (soft 404) | `blog/[slug]/page.tsx:84-86` | [M] `/blog/does-not-exist-xyz` returns 200 "Post not found". | Call `notFound()`, and add `src/app/not-found.tsx` with the site navigation. |
| P2-8 | CRM/ops writes rely only on SameSite cookies | All CRM/ops POST/PUT/DELETE | [C] No Origin or Content-Type check. `blog.cradlewell.com` (WordPress) counts as same-site. | Reject requests whose `Origin` isn't www in the middleware, and require `application/json`. |
| P2-9 | Ops APIs have no input validation | `api/ops/staff:16-38`, `ops/state:16-37`, `ops/travel:19-31` | [C] Request bodies go straight into the database. Malformed JSON causes a 500. HTML injection is possible in `OpsMap.jsx:20-27`. | Add zod schemas, return 400 for bad JSON, and escape map labels. |
| P2-10 | Logout uses a shared Supabase client | `api/crm/auth/route.ts:13-17,49-50` (and the ops route) | [C] `setSession` + `signOut` on a singleton client (global scope). | Create a client per request, or call `admin.signOut` with scope `local`. |
| P2-11 | Social shares of inner pages show the homepage | `src/app/layout.tsx:32-48` | [M] Privacy, thank-you and blog posts inherit `og:url` = homepage. | Set openGraph per page, or remove `url` from the root. |
| P2-12 | AI crawler rules override the general disallows | `src/app/robots.ts:5-27` | [M] GPTBot, ClaudeBot and others get only `Allow: /`, so `/api/` and `/thankyou` aren't disallowed for them. | Repeat the disallow lines in each bot group. |
| P2-13 | Form labels not linked to inputs | `ModalContext.tsx:268-414`; `AIChatWidget.tsx:732-859` | [C] `<label>` with no `htmlFor`/`id`. | Add `id`/`htmlFor` or `aria-label`. |
| P2-14 | Big JSX files aren't linted or type-checked, and `npm run lint` is broken | `CradlewellCRM.jsx` (11.6k lines), `OpsBoard.jsx`, `OpsMap.jsx`; `package.json` | [C] ESLint skips these `.jsx` files. `next lint` was removed in Next 16. `eslint-config-next` is 15.3.5 against Next 16. | `"lint": "eslint ."`, include `**/*.jsx` in the lint config, and upgrade `eslint-config-next` to 16. |

### P3: minor

| # | Issue | Location | Fix |
|---|---|---|---|
| P3-1 | Brand twice in titles ("… – Cradlewell - Cradlewell") | Title template in `layout.tsx:18` and page titles | Remove the brand from page-level titles. |
| P3-2 | Thank-you page is indexable, with title "Cradlewell" | `(site)/thankyou/page.tsx` | `robots: { index: false }`. |
| P3-3 | OG image declared as 1200×630 but is really 625×525 | `layout.tsx:42-45` | Make a real 1200×630 JPG/WebP (about 100 KB). |
| P3-4 | Hero `width/height` (600×500) don't match the image's 1693×929 | `HeroHeaderShape.tsx:100-101` | Use the real proportions; `next/image` handles this. |
| P3-5 | `window.open` without `noopener` | `AIChatWidget.tsx:103`, `PromoTrialSection.tsx:123` | Pass `"noopener,noreferrer"`. |
| P3-6 | Name pattern rejects real names (`.`, `'`, `-`, Indic scripts), and an invalid name shows no message | `ModalContext.tsx:270` | Relax the pattern and show a hint. |
| P3-7 | Login responses reveal which accounts exist (403 after a correct password) | auth routes `:33-35` | Return the same 401. |
| P3-8 | Ops customers query isn't paged (stops at 1,000 rows) | `api/ops/customers/route.ts:37-47` | Use `fetchAllPages`. |
| P3-9 | WordPress default post at `/blog/hello-world` (actually the jaundice article) is in the sitemap | WordPress | Change the slug in WordPress and add a 301. |
| P3-10 | Headings skip levels (footer `h4` after `h2`; blog `h1` then `h3`) | `Footer.tsx:45,67,79`; `blog/page.tsx:50,86` | Fix the heading order. |
| P3-11 | Unused secrets in the environment | `.env.local` / Vercel: `GEMINI_API_KEY`, `GOOGLE_SHEET_WEBHOOK_URL`, `WHATSAPP_*` | Remove them from Vercel. |
| P3-12 | `middleware.ts` file name is deprecated in Next 16 | `src/middleware.ts` | Rename to `proxy.ts` when upgrading. |

---

## 3. Unused code report

**Method:** an import graph from all 31 entry points, with every candidate's file and export names searched across the repo, configs, CSS and `public/`. The packages, files and images below were spot-checked again by hand.

### Files (High confidence, no references anywhere)

| File | Size |
|---|---|
| `src/components/ModalController.tsx` (old copy of the lead form) | 12.5 KB |
| `src/components/DarkBreakSection.tsx` | 6.4 KB |
| `src/components/TeamCarousel.tsx` | 4.2 KB |
| `src/components/WhatsAppWidget.tsx` | 0.7 KB |
| `src/components/ui/` (8 files; only the unused `index.ts` imports them) | about 31 KB |
| `src/hooks/useOpsData.ts`, `src/hooks/useRotaConflicts.ts` (abandoned refactor) | 7.8 KB |
| `src/lib/api-client.ts`, `crm-invoice-pdf.ts`, `supabase-client.ts`, `whatsapp-stage.ts` | about 18 KB |
| `src/app/chat/route.ts` + `lib/cradlewell-knowledge.ts` + `lib/chat-utils.ts` (**Medium**: check Vercel logs for outside callers first) | — |

### Dead code inside live files (High)
- **`CradlewellCRM.jsx`, about 717 lines** (exact lines are in the unused-code review):
  - unused constants and mock data: `QUEUE_ITEMS`, colour constants, `UNREAD_*`, `PACKAGE_DEFAULTS`, the old synthetic-report generator (`mulberry32`, `SOURCE_MULT`, …);
  - the unused components `SavedViewItem` and `ShortcutBar`;
  - 7 hidden Settings pages and their helpers;
  - the unused `Info` and `Bell` icon imports.
- **`(site)/page.tsx`:**
  - `:10` the `Footer` import isn't used;
  - `:12` the `HeroHeaderShape` named import isn't used.
- **`LandingShell.tsx:11-16`:** the `isCRM`/`isOps` branch can never run.
- **`privacy-policy/page.tsx`:** the `next/head` usage does nothing in the App Router.
- **`OpsBoard.jsx:34`:** `TRIP_TYPES` is unused.
- **Medium:** the `SELL_EXPERTS=false` branches (a feature that is switched off).

### npm packages never imported (High)

| Package | Note |
|---|---|
| `@fortawesome/fontawesome-free`, `fontawesome-svg-core`, `free-solid-svg-icons`, `react-fontawesome` | about 35 MB in node_modules |
| `@fontsource/outfit`, `@google/generative-ai`, `openai`, `date-fns`, `framer-motion`, `sonner`, `swiper` | never imported |
| `jspdf` | only used by the dead `crm-invoice-pdf.ts`; also brings the `dompurify` high-severity advisory |
| `@anthropic-ai/sdk` | Medium: remove with `/chat` |
| `@emnapi/runtime` | extraneous; `npm prune` |

Because none of these is imported, removing them **won't shrink the downloaded JavaScript** [I]. It cuts install and build time and removes 3 advisories.

### Public assets: 29 unreferenced files, about 12 MB (High)
- `images/testimonial3.png` (7.5 MB), `testimonial3.svg` (1 MB), `testimonial1/2.png`, `testimonial3.jpg`
- the `whychoose/` folder (10 files, 2.4 MB)
- `images/founder1-4.png`
- the `icons/` folder (5 files)
- `images/illustration.svg`, `Vector.svg`, `award_photo.jpg` (2 bytes), `cw_logo.png`
- `trip-planner.html` (see P0-1)

**Keep** `llms.txt`.

### CSS (High)
- **`globals.css` rules that match nothing:**
  - `.btn-cta` (`:143,152`), `.btn-outline-light` (`:160,169`), `.hero-trust-bar` (`:216,233`)
  - `.testimonial-stars` (`:699`), `.steps-card` (`:759,766`), `.stat-divider` (`:791`)
  - `.ratio-reel` (`:819,825`), `.hero-badge*` (`:981-1012`), `.hero-enter-d1` (`:1021`)
  - `.cw-testimonial-*` (`:1055-1088`)
- **`ops.css`:** `.ops-num` (`:40`) and `.ops-sidebar` (`:147`) are unused.
- **Medium:** `tailwind.config.js` and the `@tailwind` lines in `ops.css` produce almost nothing, because the content globs miss `.jsx`.

### Root leftovers
- `supabase-whatsapp-tables.sql` (High).
- `supabase-schema.sql`: stale; move it into `migrations/` or delete it (Medium).
- `README.md`: empty.
- `tsconfig.tsbuildinfo`: generated and git-ignored.

### Duplication to consolidate later (not deletions)
- The phone number `9363893639` is hard-coded 14 times in 8 files.
- The CRM and ops auth routes are near-identical.
- There are 3 zone models: `geo-utils`, `OpsBoard`, `zones.ts`.
- Two chat routes exist.

---

## 4. Performance report

### Baseline (measured on the live site, no changes made)

| Profile | Page | TTFB | FCP | LCP | CLS | TBT | Load | Requests | LCP element |
|---|---|---|---|---|---|---|---|---|---|
| Mobile | `/` (run 1) | 234 ms | 4.9 s | **41.2 s** | 0 | 15.0 s | 65.4 s | 57 | hero PNG |
| Mobile | `/` (run 2) | 364 ms | 25.8 s | **61.6 s** | 0 | 61.8 s | not finished in 90 s | — | hero PNG |
| Mobile | `/blog` | 255 ms | 28.9 s | 28.9 s | 0.037 | 64.3 s | 100 s | 41 | heading text |
| Mobile | `/privacy-policy` | 367 ms | 5.7 s | 14.1 s | 0.022 | 83.2 s | not finished in 90 s | 32 | text |
| Desktop | `/` (run 1) | 159 ms | 3.1 s | 3.1 s | 0.003 | 4.1 s | 10.9 s | 58 | logo |
| Desktop | `/` (run 2) | 231 ms | 1.7 s | 4.0 s | 0.012 | 6.0 s | 11.7 s | 55 | hero PNG |
| Desktop | `/blog` | 186 ms | 2.1 s | 2.1 s | 0.003 | 4.3 s | 8.5 s | 59 | H1 |
| Desktop | `/privacy-policy` | 1,481 ms | 6.2 s | 6.2 s | 0.002 | 3.9 s | 12.2 s | 47 | text |

**Other measurements:**
- **Server response (TTFB, curl):** `/`, `/privacy-policy` and `/sitemap.xml` take 0.28–0.41 s, served from Vercel's cache. Blog posts take **0.88–1.36 s and are never cached**.
- **CRM data load:** 2.1–3.1 s on the live site before this session's region change. The new Mumbai pinning is deployed, but its live speed hasn't been measured yet.

**How to read these:** the mobile numbers use Lighthouse's throttling on one machine, and the TBT values include the time spent waiting for the 27 MB of images. Treat them as order-of-magnitude, not exact. INP wasn't measured (it needs real-user data); TBT is the lab stand-in. A PageSpeed Insights / CrUX run is recommended for field data.

### Page weight (desktop homepage, measured)

| Type | Requests | Transferred |
|---|---|---|
| First-party images | 15 | **27,491 KB** |
| First-party JS | 14 | 235 KB (about 760 KB uncompressed) |
| Third-party JS | 7 | 156 KB (Meta `fbevents` 97 KB) |
| First-party CSS | 2 | 40 KB |
| HTML | 1 | 22 KB (116 KB uncompressed) |

Other pages carry the same JS, plus `bannerimg.png` (464 KB) from the wrong preload.

### JavaScript bundles (from the production build and the live chunks)

| Route | First-load JS (uncompressed) | Main libraries |
|---|---|---|
| `/` | 732 KB | React DOM (221 KB raw / 69 KB gz), react-bootstrap, GSAP + ScrollTrigger (101 KB raw / 36 KB gz), react-icons, AIChatWidget |
| other site pages | about 670 KB | same shared set from `LandingShell` |
| `/crm` | 1,285 KB | one 779 KB chunk (CRM + recharts) |
| `/operations` | 611 KB | Leaflet loaded on demand (151 KB) |

### Where main-thread time goes (desktop trace, homepage)

| Task | Main-thread time |
|---|---|
| Google Ads tag | 1,233 ms |
| Meta signals config | 714 ms |
| Meta `fbevents.js` | 540 ms |
| GTM | about 400 ms |
| GA4 | about 260 ms |
| Layout passes | 338 ms + 798 ms |
| Site JS (React and components) | about 700 ms |

### Root causes, in order
1. Unoptimised, eagerly loaded images (27.5 MB), especially the 21.8 MB award photo.
2. Third-party tags loaded early and twice.
3. The wrong preload and render-blocking web fonts.
4. Images not cached by browsers.
5. Blog posts rendered fresh from WordPress on every request.
6. Decorative GSAP and Bootstrap CSS shipped site-wide.

### Expected improvements (*estimates, not measured*)
- **Images (P1-1/2/3/5/6):** homepage image weight from about 27.5 MB to about 1–1.5 MB. Mobile LCP from about 41 s to about 3–5 s on the same throttled profile.
- **Tags (P1-4):** desktop TBT from about 4–6 s to about 1 s or less, by moving about 3 s of script out of the critical window.
- **Fonts (P2-1):** FCP about 0.3–0.8 s earlier on mobile.
- **Blog ISR (P1-8):** post TTFB from about 1.1 s to about 0.2–0.3 s.

Every estimate needs re-measuring after the change.

---

## 5. Implementation roadmap

### Immediate (same day, low risk)
1. **Outside the code:** rotate and restrict the 3 Google keys (P0-1). Remove `ANTHROPIC_API_KEY` and other unused secrets from Vercel if `/chat` is removed (P0-2, P3-11). Add the bare-domain → www redirect (P1-12). Enable RLS on the `whatsapp_*` tables (P1-15).
2. Delete `public/trip-planner.html` and `src/app/chat/route.ts` and its helpers (P0-1, P0-2).
3. Upgrade `next` to the latest 16.x and `zod` to 4.6.6 or later, then build and run the tests (P0-3).
4. Remove the `bannerimg.png` preload (P1-3) and fix the homepage title (P1-13).

### High-impact optimisations (1–2 days)
5. **Images:**
   - re-export `award_photo`, the hero, `background`, `img1`, the logos and the team photos at their display size as WebP/AVIF;
   - switch the plain `<img>` tags to `next/image` (11 ESLint `no-img-element` warnings);
   - lazy-load below the fold;
   - add long cache headers for `/images` (P1-1, 2, 5, 6).
6. **Marketing tags:** load them through GTM only, lazily, and remove the duplicate GA tag (P1-4).
7. **Fonts:** `next/font` with fewer weights (P2-1).
8. **Blog:**
   - shared WordPress constant (P1-7);
   - ISR caching (P1-8);
   - real metadata and canonical (P1-9);
   - `notFound()` for missing posts and a site 404 page (P2-7).

### Security and architecture (2–4 days)
9. `requireAuth` verifies the JWT and role itself (P0-3), with Origin and Content-Type checks on writes (P2-8).
10. Sanitise WordPress HTML and add a CSP, Report-Only first (P1-10, P1-11).
11. Make the lead form fill-only for existing leads and fix `source` on the server (P1-14).
12. zod on the ops APIs, escape the map labels, a per-request logout client, and a pageable ops customers query (P2-9, P2-10, P3-8).
13. Pin `/api/lead`, the auth routes and the ops routes to `bom1` (P2-5).
14. Structured data scoped to the right pages, with the broken images fixed; OG per page; robots bot groups (P2-6, P2-11, P2-12).

### Clean-up (half a day, after the above)
15. Delete the unused files, packages, images and CSS listed in section 3, then rebuild and run the tests.
16. Fix linting: `eslint .` including `.jsx`, and `eslint-config-next@16` (P2-14).

### Optional enhancements
- Replace the GSAP click effect with CSS (P2-3); remove Bootstrap from `/operations` (P2-2).
- Lazy-load the CRM Reports view (recharts) to shrink `/crm`'s first load.
- Consolidate the hard-coded phone number, the zone models and the auth routes.
- Fix headings, labels, alt text and the name pattern; mark the thank-you page `noindex`; make a real OG image (P3 items).
- Serve the CRM from its own subdomain, separate from the marketing site and blog.

**Not tested in this audit:**
- real-user (field) Core Web Vitals and INP;
- Lighthouse scores;
- real form submissions and any Meta/Google conversion events (blocked on purpose);
- whether the Google keys are restricted;
- whether `ANTHROPIC_API_KEY` is set in Vercel;
- whether the Next middleware bypasses can actually be exploited on Vercel;
- Safari and Firefox (Chromium only).
