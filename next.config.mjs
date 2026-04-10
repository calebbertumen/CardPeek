/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io", pathname: "/**" },
      { protocol: "https", hostname: "images.scrydex.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ebayimg.com", pathname: "/**" },
      { protocol: "https", hostname: "thumbs.ebaystatic.com", pathname: "/**" },
      { protocol: "https", hostname: "ir.ebaystatic.com", pathname: "/**" },
      { protocol: "https", hostname: "pictures.ebay.com", pathname: "/**" },
    ],
  },

  /**
   * Dev-only: disable webpack’s persistent cache so HMR cannot leave the graph in a bad state.
   * That stale state often surfaces as `TypeError: __webpack_modules__[moduleId] is not a function`
   * until you delete `.next` and restart. Tradeoff: slightly slower incremental compiles.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
