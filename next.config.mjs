/** @type {import('next').NextConfig} */
const nextConfig = {
  // GoDaddy vb. statik hostingler için HTML çıktısı alır
  output: 'export',
  images: {
    // Statik export'ta resim optimizasyonu kapatılmalıdır
    unoptimized: true,
  },
};

export default nextConfig;
