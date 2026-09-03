const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  // react-leaflet v4 requires transpilation in Next.js
  transpilePackages: ['react-leaflet', '@react-leaflet/core'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: '**.edmunds-media.com' },
      { protocol: 'https', hostname: 'media.ed.edmunds-media.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: '**.honda.com.vn' },
      { protocol: 'https', hostname: 'images.pexels.com' },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};

module.exports = nextConfig;

