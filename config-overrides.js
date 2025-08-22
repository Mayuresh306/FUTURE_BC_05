const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: require.resolve("stream-browserify"),
    crypto: require.resolve("crypto-browserify"),
    buffer: require.resolve("buffer"),
    process: require.resolve("process/browser.js"),
    util: require.resolve("util/"),
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      // process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
