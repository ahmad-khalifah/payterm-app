/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This allows production builds to complete even if
    // the project has type errors (like the Deno imports).
    ignoreBuildErrors: true,
  },
  eslint: {
    // This also prevents ESLint from crashing the build for the same reason
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;