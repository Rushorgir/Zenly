#!/usr/bin/env node
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

import { Resource } from '../models/resource.model.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zenly'

const argv = process.argv.slice(2)
let title = null
let apply = false
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === '--title' && argv[i+1]) { title = argv[i+1]; i++; }
  if (a === '--apply') apply = true
}

if (!title) {
  console.error('Usage: node delete-resource-by-title.js --title "Exact Resource Title" [--apply]')
  process.exit(1)
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')

    const matches = await Resource.find({ title: title })
    if (!matches || matches.length === 0) {
      console.log('No resources found with title:', title)
      await mongoose.disconnect()
      process.exit(0)
    }

    console.log(`Found ${matches.length} matching resource(s):`)
    matches.forEach((r, i) => console.log(`${i+1}. ${r.title} - ${r.type} - ${r.url} (id: ${r._id})`))

    if (!apply) {
      console.log('\nDry run — no changes made. To delete, re-run with --apply')
      await mongoose.disconnect()
      process.exit(0)
    }

    const ids = matches.map(m => m._id)
    const res = await Resource.deleteMany({ _id: { $in: ids } })
    console.log(`\n✅ Deleted ${res.deletedCount} resource(s) with title: ${title}`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err && (err.message || err))
    process.exit(1)
  }
}

main()
