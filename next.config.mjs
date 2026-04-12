/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    typedRoutes: true
  },
  pageExtensions: ["ts", "tsx", "mdx"]
};

export default nextConfig;
