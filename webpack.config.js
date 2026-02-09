const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ConcatPlugin = require('@mcler/webpack-concat-plugin');
const JsonMinimizerPlugin = require("json-minimizer-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
  /// background script
  entry: {
    background: "./src/functions/background.js",
    "popup/popup": "./src/popup/popup.js",
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  plugins: [
    /// content scripts
    new ConcatPlugin({
      name: 'content',
      outputPath: './',
      fileName: '[name].js',
      filesToConcat: [
        "./src/data/**",
        [
          "./src/functions/**",
          "!./src/functions/background.js",
        ],
        "./src/ui/**/**",
        "./src/index.js",
      ]
    }),
    /// static files
    new CopyPlugin({
      patterns: [
        {
          from: "src/manifest.json",
          to: "manifest.json",
        },
        "src/index.css",
        { from: "src/_locales", to: "_locales" },
        { from: "src/assets", to: "assets" },
        { from: "src/popup", to: "popup", globOptions: { ignore: ["**/popup.js"] } },
      ],
    }),
  ],
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(), 
      new CssMinimizerPlugin(),
      new JsonMinimizerPlugin(),
    ],
  },
};