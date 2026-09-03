import { put, list } from '@vercel/blob';
import initialConfig from './initialConfig.json' with { type: 'json' };

const CONFIG_PATHNAME = 'config/site-na.json';

export async function getConfig() {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATHNAME, limit: 1 });
    const match = blobs.find((b) => b.pathname === CONFIG_PATHNAME);
    if (!match) return initialConfig;
    const res = await fetch(match.url, { cache: 'no-store' });
    if (!res.ok) return initialConfig;
    return await res.json();
  } catch (err) {
    console.error('getConfig failed, falling back to initialConfig', err);
    return initialConfig;
  }
}

export async function saveConfig(config) {
  const body = JSON.stringify(config, null, 2);
  await put(CONFIG_PATHNAME, body, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
  return config;
}
