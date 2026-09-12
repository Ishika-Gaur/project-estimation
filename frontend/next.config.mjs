import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    // Keep the hot-reload cache separate from production builds. Running
    // `next build` while the development server is open otherwise replaces
    // chunks that the server still has in memory.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    async redirects() {
      return [
        {
          source: "/tasks",
          destination: "/task-distribution",
          permanent: false,
        },
      ];
    },
  };
}
