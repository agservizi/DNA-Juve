import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  allowedDevOrigins: ['192.168.1.19'],
  outputFileTracingRoot: process.cwd(),
  experimental: {
    optimizePackageImports: ['three', '@react-three/drei', 'motion'],
    // Avoid Vercel immutable-static upload path that currently fails this project.
    supportsImmutableAssets: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
  async rewrites() {
    return []
  },
  async redirects() {
    const legacyOrigin = process.env.LEGACY_APP_ORIGIN
    if (!legacyOrigin) return []
    const destination = legacyOrigin.replace(/\/$/, '')
    const legacyRoutes = ['/admin/:path*']
    return legacyRoutes.map((source) => ({ source, destination: `${destination}${source}`, permanent: false }))
  },
}

export default nextConfig
