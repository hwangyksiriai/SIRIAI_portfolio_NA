// One-off migration: uploads every file under media/ to Vercel Blob, then
// rewrites lib/initialConfig.json's clip URLs to point at the uploaded Blob
// URLs, and saves that as the live config/site.json in Blob.
//
// Usage: npm run migrate-blob   (requires BLOB_READ_WRITE_TOKEN in .env.local)

import { put, list } from '@vercel/blob';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MEDIA_DIR = path.join(process.cwd(), 'media');
const CONFIG_PATH = path.join(process.cwd(), 'lib', 'initialConfig.json');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN — run `vercel env pull .env.local` first.');
    process.exit(1);
  }

  console.log('Scanning media/ ...');
  const files = await walk(MEDIA_DIR);
  console.log(`Found ${files.length} files.`);

  // Skip re-uploading anything already present at the same pathname.
  const existing = await list({ prefix: 'media/', limit: 1000 });
  const existingPathnames = new Set(existing.blobs.map((b) => b.pathname));

  const urlMap = {};
  let done = 0;
  for (const absPath of files) {
    const rel = toPosix(path.relative(process.cwd(), absPath)); // e.g. media/beauty/lee-jerin.mp4
    done += 1;
    if (existingPathnames.has(rel)) {
      const found = existing.blobs.find((b) => b.pathname === rel);
      urlMap[rel] = found.url;
      console.log(`[${done}/${files.length}] skip (exists): ${rel}`);
      continue;
    }
    const buffer = await readFile(absPath);
    const contentType = rel.endsWith('.mp4') ? 'video/mp4'
      : rel.endsWith('.png') ? 'image/png'
      : rel.endsWith('.jpg') || rel.endsWith('.jpeg') ? 'image/jpeg'
      : undefined;
    const result = await put(rel, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    });
    urlMap[rel] = result.url;
    console.log(`[${done}/${files.length}] uploaded: ${rel}`);
  }

  console.log('Rewriting config clip URLs...');
  const configRaw = await readFile(CONFIG_PATH, 'utf-8');
  const config = JSON.parse(configRaw);

  let replaced = 0;
  let missing = 0;
  function mapClip(clip) {
    if (urlMap[clip]) {
      replaced += 1;
      return urlMap[clip];
    }
    missing += 1;
    console.warn(`  ! no blob URL found for ${clip}`);
    return clip;
  }

  for (const cat of config.categories) {
    if (cat.clips) cat.clips = cat.clips.map(mapClip);
    if (cat.regions) {
      for (const region of cat.regions) {
        region.clips = region.clips.map(mapClip);
      }
    }
  }

  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`Config updated: ${replaced} clips mapped, ${missing} missing.`);

  console.log('Publishing config/site-na.json to Blob...');
  await put('config/site-na.json', JSON.stringify(config, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
