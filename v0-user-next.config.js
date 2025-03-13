/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_EMAIL: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
}

module.exports = nextConfig

