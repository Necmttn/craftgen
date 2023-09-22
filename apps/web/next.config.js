/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    unoptimized: true,
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: "/discord",
          destination: "https://discord.gg/c5tyy982V5",
        },
      ],
      afterFiles: [
        {
          source: "/:project",
          destination: "/project/:project",
        },
        {
          source: "/:project/settings",
          destination: "/project/:project/settings",
        },
        {
          source: "/:project/:playground*",
          destination: "/project/:project/playground/:playground*",
        },
      ],
      fallback: [
        {
          source: "/ingest/:path*",
          destination: "https://app.posthog.com/:path*",
        },
      ],
    };
  },
};

module.exports = nextConfig;
