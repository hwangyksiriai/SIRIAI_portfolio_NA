import { put, list } from '@vercel/blob';
import initialConfig from './initialConfig.json' with { type: 'json' };

const CONFIG_PATHNAME = 'config/site-na.json';

/* initialConfig owns which categories exist and in what order; the stored copy
   only supplies each one's edited clips and title. The admin can edit a
   category but cannot add or remove one, so without this a category deleted
   from the source would live on forever in the Blob copy, and a newly added one
   would never show up. Deleting a category here deletes it everywhere. */
function withSourceCategories(stored) {
  if (!stored || !Array.isArray(stored.categories)) return initialConfig;
  const edited = new Map(stored.categories.map((c) => [c.id, c]));
  return {
    ...stored,
    categories: initialConfig.categories.map((c) => edited.get(c.id) || c),
  };
}

export async function getConfig() {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATHNAME, limit: 1 });
    const match = blobs.find((b) => b.pathname === CONFIG_PATHNAME);
    if (!match) return initialConfig;
    const res = await fetch(match.url, { cache: 'no-store' });
    if (!res.ok) return initialConfig;
    return withSourceCategories(await res.json());
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
