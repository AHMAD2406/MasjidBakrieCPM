/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  images: {
    unoptimized: true,
  },

  reactCompiler: true,
  
  // Ensure maximum compatibility with older browsers (WebOS TV)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Disable strict mode for better performance on TV browsers
  reactStrictMode: false,
};

export default nextConfig;
