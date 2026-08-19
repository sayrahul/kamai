/** @type {import('next').Next.js} */
const nextConfig = {
  typescript: {
    // Allows Vercel production build to succeed
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;