# old-sunset-4710 Cloudflare Worker

Single-file Cloudflare Worker for the Card Tab page.

## What changed

- Removed the external `encode=js` Hitokoto script from first paint and replaced it with controlled JSON loading. This prevents third-party script syntax errors from pinning the startup error banner.
- Added FLIP-style section movement animation for category up/down controls so reordered sections glide into place instead of jumping.
- Added a responsive product-style header, semantic page structure, accessible search controls, modern section surfaces, and roomier cards.
- Reduced public-card DOM and listeners by rendering native links and creating edit/drag controls only in admin mode.
- Changed category rendering from repeated category × link scans to a single grouping pass with batched DOM insertion.
- Added `content-visibility`, IntersectionObserver category tracking, session-cached Hitokoto text, and visibility/save-data aware background timers.
- Moved Bing background discovery to the edge-cached `/api/backgrounds` endpoint so third-party latency no longer blocks the HTML response.
- Added cache and baseline security headers for HTML and JSON responses.
- Added local syntax/runtime render checks.

## Commands

```bash
npm run check
npm run render-check
npm run build
wrangler deploy worker.js --keep-vars
```

Cloudflare secrets such as `ADMIN_PASSWORD` and API credentials are intentionally not stored in this repository.
