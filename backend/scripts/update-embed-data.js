#!/usr/bin/env node
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { Resource } from '../models/resource.model.js';
import fetch from 'node-fetch';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/zenly';

async function updateEmbedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const resources = await Resource.find({});
    console.log(`Found ${resources.length} resources to update`);

    let updated = 0;
    for (const resource of resources) {
      resource.extractEmbedData();

      // If platform is web or no thumbnail, try to fetch og:image for a thumbnail
      try {
        if (resource.embedData?.platform === 'web' && !resource.embedData?.thumbnailUrl) {
          const res = await fetch(resource.url, { redirect: 'follow', headers: { 'User-Agent': 'Zenly/1.0' } });
          const text = await res.text();
          let m = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
          if (m && m[1]) resource.embedData.thumbnailUrl = m[1];
          else {
            m = text.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            if (m && m[1]) resource.embedData.thumbnailUrl = m[1];
          }
        }
      } catch {
        // ignore network errors
      }

      await resource.save();
      updated++;
      console.log(`✅ Updated ${resource.title} - platform: ${resource.embedData?.platform}, embedId: ${resource.embedData?.embedId || 'N/A'}`);
    }

    console.log(`\n✅ Updated ${updated} resources with embed data`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateEmbedData();
