/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      // @solana/web3.js needs Buffer in the browser (tx serialization / memo).
      buffer: require.resolve('buffer/'),
    };
    config.plugins.push(
      new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'] })
    );
    return config;
  },
  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-wallets',
  ],
};

module.exports = nextConfig;
