/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  pageExtensions: ["ts", "tsx", "mdx"]
};

export default nextConfig;
