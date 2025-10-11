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

const args = process.argv.slice(2)
const apply = args.includes('--apply')

async function removeArticles() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')

    const articles = await Resource.find({ type: 'article' })
    if (articles.length === 0) {
      console.log('No article resources found.')
      await mongoose.disconnect()
      process.exit(0)
    }

    console.log(`Found ${articles.length} article resources:`)
    articles.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title} - ${r.url} (id: ${r._id})`)
    })

    if (!apply) {
      console.log('\nDry run mode — no changes made. To delete these, re-run with --apply')
      await mongoose.disconnect()
      process.exit(0)
    }

    const ids = articles.map(a => a._id)
    const res = await Resource.deleteMany({ _id: { $in: ids } })
    console.log(`\n✅ Deleted ${res.deletedCount} article resources`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

removeArticles()
