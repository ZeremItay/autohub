import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Headers to allow microphone and camera for Zoom iframe
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'microphone=*, camera=*, display-capture=*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
