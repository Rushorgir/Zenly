#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import { Resource } from "../models/resource.model.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/zenly";

const sampleResources = [
  // VIDEOS
  {
    title: "Understanding Anxiety: A Complete Guide",
    description:
      "Learn about anxiety symptoms, triggers, and evidence-based coping strategies. This comprehensive video explains how your nervous system responds to stress.",
    url: "https://www.youtube.com/watch?v=WWloIAQpMcQ",
    type: "video",
    categories: ["anxiety", "mental-health", "education"],
    tags: ["anxiety", "coping", "stress management"],
    language: "English",
    duration: "18 min",
    author: "Therapy in a Nutshell",
    isFeatured: true,
    priority: 10,
  },
  {
    title: "5 Minute Breathing Exercise for Stress Relief",
    description:
      "Quick and effective breathing techniques you can use anywhere to calm anxiety and reduce stress instantly.",
    url: "https://www.youtube.com/watch?v=aXItOY0sLRY",
    type: "video",
    categories: ["breathing", "stress", "self-care"],
    tags: ["breathing", "quick relief", "anxiety"],
    language: "English",
    duration: "5 min",
    author: "The Mindful Movement",
    isFeatured: true,
    priority: 9,
  },
  {
    title: "Depression: Causes, Symptoms & Treatment",
    description:
      "An evidence-based explanation of depression, its biological and psychological causes, and modern treatment approaches.",
    url: "https://www.youtube.com/watch?v=z-IR48Mb3W0",
    type: "video",
    categories: ["depression", "mental-health", "treatment"],
    tags: ["depression", "therapy", "treatment"],
    language: "English",
    duration: "22 min",
    author: "Psych Hub",
    isFeatured: true,
    priority: 8,
  },
  {
    title: "How to Build Healthy Habits",
    description:
      "Science-backed strategies for creating sustainable healthy habits and breaking bad ones.",
    url: "https://www.youtube.com/watch?v=laeYq51SYA0",
    type: "video",
    categories: ["habits", "wellness", "self-improvement"],
    tags: ["habits", "behavior change", "wellness"],
    language: "English",
    duration: "15 min",
    author: "HealthyGamerGG",
    isFeatured: true,
    priority: 7,
  },

  // AUDIO/PODCASTS
  {
    title: "The Science of Mindfulness",
    description:
      "Explore the neuroscience behind mindfulness meditation and how it can rewire your brain for better mental health.",
    url: "https://open.spotify.com/episode/4VSpP2v0zvtJOv0WEJJEIq",
    type: "audio",
    categories: ["mindfulness", "neuroscience", "meditation"],
    tags: ["mindfulness", "brain health", "meditation"],
    language: "English",
    duration: "45 min",
    author: "Huberman Lab",
    isFeatured: true,
    priority: 10,
  },
  {
    title: "Overcoming Perfectionism",
    description:
      "Learn to identify perfectionist tendencies and develop self-compassion. Practical strategies to break free from harsh inner criticism.",
    url: "https://open.spotify.com/episode/2MAi8V0HXAc7A3h1S6nECy",
    type: "audio",
    categories: ["perfectionism", "self-compassion", "mental-health"],
    tags: ["perfectionism", "self-compassion", "inner critic"],
    language: "English",
    duration: "38 min",
    author: "The Happiness Lab",
    isFeatured: true,
    priority: 9,
  },
  {
    title: "Understanding Trauma and PTSD",
    description:
      "A compassionate exploration of trauma, its effects on the mind and body, and evidence-based approaches to healing.",
    url: "https://open.spotify.com/episode/3KZjUdQGPBCGVL6WHJwO5L",
    type: "audio",
    categories: ["trauma", "ptsd", "healing"],
    tags: ["trauma", "ptsd", "healing"],
    language: "English",
    duration: "52 min",
    author: "On Being",
    isFeatured: true,
    priority: 8,
  },
  {
    title: "Building Emotional Resilience",
    description:
      "Discover how to bounce back from setbacks and build mental toughness through evidence-based practices.",
    url: "https://open.spotify.com/episode/5JKE8zvX6YfMpQJ9y0Q7jF",
    type: "audio",
    categories: ["resilience", "mental-health", "coping"],
    tags: ["resilience", "emotional strength", "coping"],
    language: "English",
    duration: "40 min",
    author: "Ten Percent Happier",
    isFeatured: true,
    priority: 7,
  },

  // ARTICLES
  {
    title: "Cognitive Behavioral Therapy: A Complete Guide",
    description:
      "An in-depth guide to CBT techniques, how they work, and how to apply them to manage anxiety, depression, and negative thought patterns.",
    url: "https://www.verywellmind.com/what-is-cognitive-behavior-therapy-2795747",
    type: "article",
    categories: ["cbt", "therapy", "mental-health"],
    tags: ["cbt", "therapy", "techniques"],
    language: "English",
    duration: "12 min read",
    author: "Verywell Mind",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=800",
    isFeatured: true,
    priority: 10,
  },
  {
    title: "10 Evidence-Based Strategies for Better Sleep",
    description:
      "Science-backed sleep hygiene practices to improve sleep quality, from circadian rhythm optimization to bedroom environment setup.",
    url: "https://www.sleepfoundation.org/sleep-hygiene",
    type: "article",
    categories: ["sleep", "health", "wellness"],
    tags: ["sleep hygiene", "insomnia", "rest"],
    language: "English",
    duration: "8 min read",
    author: "Sleep Foundation",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800",
    isFeatured: true,
    priority: 9,
  },
  {
    title: "Understanding Your Attachment Style",
    description:
      "Learn about secure, anxious, avoidant, and disorganized attachment styles and how they affect your relationships.",
    url: "https://www.attachmentproject.com/blog/four-attachment-styles/",
    type: "article",
    categories: ["attachment", "relationships", "psychology"],
    tags: ["attachment theory", "relationships", "emotional health"],
    language: "English",
    duration: "10 min read",
    author: "The Attachment Project",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
    isFeatured: true,
    priority: 8,
  },
  {
    title: "The Power of Gratitude: Science and Practice",
    description:
      "Discover how gratitude practices can transform your mental health and well-being, backed by scientific research.",
    url: "https://greatergood.berkeley.edu/article/item/how_gratitude_changes_you_and_your_brain",
    type: "article",
    categories: ["gratitude", "positive-psychology", "wellness"],
    tags: ["gratitude", "happiness", "well-being"],
    language: "English",
    duration: "7 min read",
    author: "Greater Good Science Center",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800",
    isFeatured: true,
    priority: 7,
  },
];

async function seedResources() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await Resource.deleteMany({});
    console.log("🗑️  Cleared existing resources");

    const resources = await Resource.insertMany(sampleResources);
    console.log(`✅ Seeded ${resources.length} resources`);

    console.log("\n📊 Summary:");
    const videos = resources.filter((r) => r.type === "video").length;
    const audios = resources.filter((r) => r.type === "audio").length;
    const articles = resources.filter((r) => r.type === "article").length;
    console.log(`   Videos: ${videos}`);
    console.log(`   Audio: ${audios}`);
    console.log(`   Articles: ${articles}`);

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedResources();
