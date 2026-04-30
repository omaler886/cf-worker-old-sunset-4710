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
if (html.includes('__INITIAL_LINKS_PAYLOAD__') || html.includes('__BACKGROUND_IMAGE_URLS__')) {
  throw new Error('Template placeholders were not replaced');
}
if (html.includes('<script src="https://v1.hitokoto.cn/?encode=js') || html.includes("<script src='https://v1.hitokoto.cn/?encode=js")) {
  throw new Error('External Hitokoto JavaScript injection is still present');
}
if (!html.includes('function loadHitokoto') || !html.includes('animateSectionReorder')) {
  throw new Error('Expected startup and reorder fixes are missing');
}

const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
await Promise.all(inlineScripts.map((script, index) => writeFile(`runtime-script-${index}.js`, script)));
console.log(`render-check ok: ${html.length} bytes, ${inlineScripts.length} inline script(s)`);
