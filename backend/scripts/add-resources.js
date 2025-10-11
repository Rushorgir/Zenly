#!/usr/bin/env node
/**
 * add-resources.js
 * Usage: node add-resources.js --file ./resources-to-add.json [--apply]
 *
 * Reads a JSON file containing an array of resource objects (same format as seed-resources.js)
 * and inserts them into the database. By default it runs in dry-run mode and prints what would
 * be inserted. Pass `--apply` to actually insert into MongoDB.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { Resource } from '../models/resource.model.js';

const argv = process.argv.slice(2);
let fileArg = null;
let apply = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--file' && argv[i+1]) { fileArg = argv[i+1]; i++; }
  if (a === '--apply') apply = true;
}

if (!fileArg) {
  console.error('Usage: node add-resources.js --file <path-to-json> [--apply]');
  process.exit(1);
}

const filePath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(payload)) throw new Error('JSON must be an array of resource objects');
} catch (err) {
  console.error('Failed to parse JSON:', err.message);
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zenly';

async function main() {
  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI);

  const toInsert = [];
  const duplicates = [];

  for (const item of payload) {
    if (!item.title || !item.url || !item.type) {
      console.warn('Skipping invalid item (missing title/url/type):', item);
      continue;
    }

    // Normalize tags to lowercase
    if (Array.isArray(item.tags)) item.tags = item.tags.map(t => String(t).toLowerCase());

    // Check for existing by exact URL or exact title
    const existing = await Resource.findOne({ $or: [ { url: item.url }, { title: item.title } ] }).lean();
    if (existing) {
      duplicates.push({ existing, item });
      continue;
    }

    toInsert.push(item);
  }

  console.log(`Found ${toInsert.length} new resources to insert.`);
  console.log(`Found ${duplicates.length} duplicates (skipped).`);

  if (toInsert.length === 0 && !apply) {
    console.log('Nothing to insert. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (!apply) {
    console.log('Dry run mode (no DB changes). Use --apply to insert.');
    toInsert.forEach((t, i) => {
      console.log(`--- Resource #${i+1}`);
      console.log('Title:', t.title);
      console.log('Type:', t.type);
      console.log('URL:', t.url);
      console.log('Tags:', (t.tags || []).join(', '));
    });
    await mongoose.disconnect();
    process.exit(0);
  }

  // Before inserting, ensure articles have embedData populated (use provided thumbnail or try to fetch OG image)
  async function fetchOgImage(url) {
    try {
      if (typeof fetch !== 'function') return null
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Zenly/1.0' } })
      const text = await res.text()
      // try og:image
      let m = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      if (m && m[1]) return m[1]
      m = text.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      if (m && m[1]) return m[1]
      return null
    } catch {
      // network or parsing error
      return null
    }
  }

  for (const item of toInsert) {
    if (item.type === 'article') {
      if (item.thumbnailUrl && String(item.thumbnailUrl).trim()) {
        item.embedData = { platform: 'web', thumbnailUrl: item.thumbnailUrl }
      } else {
        // try fetch OG image
        const og = await fetchOgImage(item.url).catch(() => null)
        if (og) item.embedData = { platform: 'web', thumbnailUrl: og }
      }
    }

    if (item.type === 'audio') {
      // detect spotify episode/show/track ids
      try {
        const u = new URL(item.url)
        if (u.hostname.includes('spotify.com')) {
          const parts = u.pathname.split('/').filter(Boolean)
          // pathname like /episode/{id} or /track/{id}
          const id = parts[1] || parts[0]
          if (id) item.embedData = { platform: 'spotify', embedId: id }
        }
      } catch {
        // ignore
      }
      // if we still don't have embedData.thumbnailUrl, try OG image for other podcast hosts
      if (!item.embedData?.thumbnailUrl) {
        try {
          if (typeof fetch === 'function') {
            const res = await fetch(item.url, { redirect: 'follow', headers: { 'User-Agent': 'Zenly/1.0' } })
            const text = await res.text()
            let m = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            if (m && m[1]) item.embedData = { platform: 'web', thumbnailUrl: m[1] }
            else {
              m = text.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
              if (m && m[1]) item.embedData = { platform: 'web', thumbnailUrl: m[1] }
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // Insert
  try {
    const created = await Resource.insertMany(toInsert, { ordered: false });
    console.log(`Inserted ${created.length} resources successfully.`);

    // For duplicates, if the existing resource lacks embedData, try to update from the incoming item
    async function updateDuplicates() {
      for (const d of duplicates) {
        const existing = d.existing
        const incoming = d.item
        if ((!existing.embedData || !existing.embedData.thumbnailUrl) && incoming) {
          let newEmbed = null
          if (incoming.thumbnailUrl && String(incoming.thumbnailUrl).trim()) {
            newEmbed = { platform: 'web', thumbnailUrl: incoming.thumbnailUrl }
          } else if (incoming.type === 'article') {
            const og = await fetchOgImage(incoming.url).catch(() => null)
            if (og) newEmbed = { platform: 'web', thumbnailUrl: og }
          } else if (incoming.type === 'audio') {
            // if incoming audio has spotify url, parse and set embed
            try {
              const u = new URL(incoming.url)
              if (u.hostname.includes('spotify.com')) {
                const parts = u.pathname.split('/').filter(Boolean)
                const id = parts[1] || parts[0]
                if (id) newEmbed = { platform: 'spotify', embedId: id }
              }
            } catch {
              // ignore
            }
          }

          if (newEmbed) {
            try {
              await Resource.findByIdAndUpdate(existing._id, { embedData: newEmbed })
              console.log(`Updated existing resource ${existing.title} with embedData`)
            } catch (err) {
              console.warn(`Failed to update existing resource ${existing._id}:`, err.message || err)
            }
          }
        }
      }
    }

    await updateDuplicates()
  } catch (err) {
    console.error('Insert encountered errors:', err && (err.message || err));
  } finally {
    await mongoose.disconnect();
  }

  // If there were no inserts but user requested --apply, still attempt to update duplicates
  if (toInsert.length === 0 && apply && duplicates.length > 0) {
    try {
      await mongoose.connect(MONGO_URI)
      console.log('Processing duplicates for embedData update...')
      async function updateDuplicatesStandalone() {
        for (const d of duplicates) {
          const existing = d.existing
          const incoming = d.item
          if ((!existing.embedData || !existing.embedData.thumbnailUrl) && incoming) {
            let newEmbed = null
            if (incoming.thumbnailUrl && String(incoming.thumbnailUrl).trim()) {
              newEmbed = { platform: 'web', thumbnailUrl: incoming.thumbnailUrl }
            } else if (incoming.type === 'article') {
              const og = await fetchOgImage(incoming.url).catch(() => null)
              if (og) newEmbed = { platform: 'web', thumbnailUrl: og }
            }
            if (newEmbed) {
              try {
                await Resource.findByIdAndUpdate(existing._id, { embedData: newEmbed })
                console.log(`Updated existing resource ${existing.title} with embedData`)
              } catch (err) {
                console.warn(`Failed to update existing resource ${existing._id}:`, err.message || err)
              }
            }
          }
        }
      }
      await updateDuplicatesStandalone()
    } catch (err) {
      console.error('Duplicates update failed:', err && (err.message || err))
    } finally {
      await mongoose.disconnect()
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
