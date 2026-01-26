/** @type {import('next').NextConfig} */
const nextConfig = {
  // Yahan hum images allow kar rahe hain taki thumbnails dikh sakein
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;