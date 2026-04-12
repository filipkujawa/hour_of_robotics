/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  pageExtensions: ["ts", "tsx", "mdx"],
  webpack(config) {
    config.module.rules.push({
      test: /\.xml$/,
      type: "asset/source"
    });
    return config;
  }
};

export default nextConfig;
