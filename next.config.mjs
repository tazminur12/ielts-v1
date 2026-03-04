/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'ielts-platform-media.s3.us-east-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'ielts-platform-media.s3.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
