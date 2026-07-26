/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.resolve.alias['@/registry/new-york-v4/ui/button'] = new URL('./components/ui/button.tsx', import.meta.url).pathname;
    return config;
  },
};

export default nextConfig;
