import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ruthvictorth.sharepoint.com',
        port: '',
        pathname: '/sites/SupportTickets/**',
      },
      {
        protocol: 'https',
        hostname: '*.sharepoint.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // เพิ่ม limit สำหรับ Server Actions เพื่อรองรับการอัปโหลดไฟล์ขนาดใหญ่
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // กำหนดไว้ 50mb เพื่อรองรับการอัปโหลดหลายไฟล์พร้อมกัน (แต่ละไฟล์จำกัดที่ 4mb ในโค้ด)
    },
  },
};

export default nextConfig;

// Force rebuild timestamp: 2025-12-03 2
