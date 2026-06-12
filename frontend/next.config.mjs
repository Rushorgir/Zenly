import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  images: {
    unoptimized: true
  },
  turbopack: {
    root: path.join(__dirname, '..')
  },
  webpack: (config) => {
    config.infrastructureLogging = { level: 'error' };
    return config;
  }
};

export default nextConfig;
