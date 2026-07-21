import worker from '../worker.js';
import { writeFile } from 'node:fs/promises';

const samplePayload = {
  links: [
    { name: 'Alpha', url: 'https://example.com/a', category: 'A', icon: '', isPrivate: false },
    { name: 'Beta', url: 'https://example.com/b', category: 'B', icon: '', isPrivate: false },
    { name: 'Gamma', url: 'https://example.com/c', category: 'C', icon: '', isPrivate: false }
  ],
  categories: {
    A: [{ name: 'Alpha', url: 'https://example.com/a', category: 'A', icon: '', isPrivate: false }],
    B: [{ name: 'Beta', url: 'https://example.com/b', category: 'B', icon: '', isPrivate: false }],
    C: [{ name: 'Gamma', url: 'https://example.com/c', category: 'C', icon: '', isPrivate: false }]
  }
};

const env = {
  CARD_ORDER: {
    get: async () => JSON.stringify(samplePayload),
    put: async () => {},
    list: async () => ({ keys: [] }),
    delete: async () => {}
  },
  BACKGROUND_IMAGE_URLS: JSON.stringify(['https://example.com/bg1.jpg', 'https://example.com/bg2.jpg']),
  BACKGROUND_BING_MARKET: 'zh-CN',
  ADMIN_PASSWORD: 'test'
};

const response = await worker.fetch(new Request('https://example.test/'), env);
const html = await response.text();
await writeFile('runtime-render-check.html', html);

if (!response.ok) {
  throw new Error(`Expected 2xx response, got ${response.status}`);
}
if (!response.headers.get('content-type')?.includes('text/html; charset=UTF-8')) {
  throw new Error('HTML response is missing an explicit UTF-8 content type');
}
if (!response.headers.get('cache-control')?.includes('stale-while-revalidate')) {
  throw new Error('HTML response is missing edge cache guidance');
}
if (response.headers.get('x-content-type-options') !== 'nosniff') {
  throw new Error('HTML response security headers are missing');
}
if (html.includes('__INITIAL_LINKS_PAYLOAD__') || html.includes('__BACKGROUND_IMAGE_URLS__') || html.includes('__API_BASE_URL__')) {
  throw new Error('Template placeholders were not replaced');
}
if (html.includes('<script src="https://v1.hitokoto.cn/?encode=js') || html.includes("<script src='https://v1.hitokoto.cn/?encode=js")) {
  throw new Error('External Hitokoto JavaScript injection is still present');
}
if (!html.includes('function loadHitokoto') || !html.includes('animateSectionReorder')) {
  throw new Error('Expected startup and reorder fixes are missing');
}
if (!html.includes('groupVisibleLinksByCategory')
  || !html.includes('content-visibility: auto;')
  || !html.includes('IntersectionObserver')
  || !html.includes('shouldLimitVisualEffects')) {
  throw new Error('Expected rendering and visual-effect performance guards are missing');
}
if (!html.includes('<header class="fixed-elements">')
  || !html.includes('<main class="content">')
  || !html.includes('class="brand-lockup"')) {
  throw new Error('Modern semantic page shell is missing');
}
if (!html.includes("const jsonHeaders = { 'Content-Type': 'application/json' };")) {
  throw new Error('Frontend JSON request headers are missing');
}
if (!html.includes('function apiUrl(path)')) {
  throw new Error('Frontend API URL helper is missing');
}
if (!html.includes('<meta name="color-scheme" content="light dark">')
  || !html.includes('color-scheme: light;')
  || !html.includes('color-scheme: dark;')) {
  throw new Error('Theme color-scheme guard is missing');
}
if (html.includes('夜间自动切换') || html.includes('白天自动切换')) {
  throw new Error('Auto theme must follow system preference, not local clock time');
}

const backgroundResponse = await worker.fetch(new Request('https://example.test/api/backgrounds'), env);
const backgroundPayload = await backgroundResponse.json();
if (!backgroundResponse.ok
  || backgroundPayload.source !== 'configured'
  || backgroundPayload.images.length !== 2) {
  throw new Error('Deferred background endpoint did not return configured images');
}
if (!backgroundResponse.headers.get('cache-control')?.includes('s-maxage=21600')) {
  throw new Error('Deferred background endpoint is missing edge cache headers');
}

const originalFetch = globalThis.fetch;
let rootExternalFetchCount = 0;
try {
  globalThis.fetch = async () => {
    rootExternalFetchCount += 1;
    throw new Error('Unexpected external request during HTML rendering');
  };
  const fallbackResponse = await worker.fetch(new Request('https://example.test/'), {
    ...env,
    BACKGROUND_IMAGE_URLS: ''
  });
  if (!fallbackResponse.ok) {
    throw new Error('Fallback HTML rendering failed without configured backgrounds');
  }
} finally {
  globalThis.fetch = originalFetch;
}
if (rootExternalFetchCount !== 0) {
  throw new Error('HTML rendering still blocks on an external background request');
}

const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
await Promise.all(inlineScripts.map((script, index) => writeFile(`runtime-script-${index}.js`, script)));
console.log(`render-check ok: ${html.length} bytes, ${inlineScripts.length} inline script(s)`);
