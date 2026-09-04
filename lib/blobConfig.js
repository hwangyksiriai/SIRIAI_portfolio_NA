import { put, list } from '@vercel/blob';
import initialConfig from './initialConfig.json' with { type: 'json' };
import { baseCategoryId, pageNumber } from './categoryIds';

const CONFIG_PATHNAME = 'config/site-na.json';

/* initialConfig owns which categories exist and in what order; the stored copy
   supplies each one's edited clips and title. Without this a category deleted
   from the source would live on forever in the Blob copy, and a newly added one
   would never show up, because the admin cannot add or remove a category.

   Continuation pages are the exception, since those the admin does create: they
   exist only in the stored config and are read straight from it. They still
   belong to their base, so deleting a category from the source takes its extra
   pages with it. */
function withSourceCategories(stored) {
  if (!stored || !Array.isArray(stored.categories)) return initialConfig;
  const edited = new Map(stored.categories.map((c) => [c.id, c]));
  const categories = [];
  for (const base of initialConfig.categories) {
    categories.push(edited.get(base.id) || base);
    categories.push(
      ...stored.categories
        .filter((c) => c.id !== base.id && baseCategoryId(c.id) === base.id)
        .sort((a, b) => pageNumber(a.id) - pageNumber(b.id))
    );
  }
  return { ...stored, categories };
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
