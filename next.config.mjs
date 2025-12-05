/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel ucretsiz paket limitlerine takilmamak icin optimizasyonu kapatiyoruz
    unoptimized: true,
  },
};

export default nextConfig;
