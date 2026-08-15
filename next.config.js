/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

let basePath = '';
let assetPrefix = '';

if (isGithubActions) {
  // Trim repo name for GitHub Pages path
  basePath = '/kamai';
  assetPrefix = '/kamai/';
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: isProd && isGithubActions ? 'export' : undefined,
  basePath: isProd && isGithubActions ? basePath : undefined,
  assetPrefix: isProd && isGithubActions ? assetPrefix : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
